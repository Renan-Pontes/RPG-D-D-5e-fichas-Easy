"""
Views de autenticação. Sessão Django + CSRF + endpoint que entrega o cookie
inicial de CSRF para o frontend pegar.
"""
import secrets
from django.contrib.auth import authenticate, login, logout, get_user_model, update_session_auth_hash
from django.middleware.csrf import get_token
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.authentication import SessionAuthentication

from .models import Profile
from .passwords import must_change, password_problem, set_own_password
from .serializers import SignupSerializer, LoginSerializer, UserSerializer
from .rate_limit import rate_limit, reset_rate_limit

User = get_user_model()


def _self_payload(user):
    """Dados da própria conta (inclui isAdmin e mustChangePassword, que não vão
    para outros usuários)."""
    return {**UserSerializer(user).data, 'isAdmin': bool(user.is_staff),
            'mustChangePassword': must_change(user)}


@api_view(['GET'])
@permission_classes([AllowAny])
def csrf(request):
    """Garante que o cookie de CSRF é enviado ao cliente. Frontend chama no boot."""
    token = get_token(request)
    return Response({'csrfToken': token})


@api_view(['POST'])
@permission_classes([AllowAny])
@rate_limit(key='signup', max_attempts=30, window=600)
def signup(request):
    SessionAuthentication().enforce_csrf(request)
    s = SignupSerializer(data=request.data)
    s.is_valid(raise_exception=True)
    email = s.validated_data['email']
    password = s.validated_data['password']
    display_name = s.validated_data.get('displayName') or email.split('@')[0]
    # username precisa ser único e curto — uso um derivado do email + sufixo aleatório se colidir.
    base_username = (email.split('@')[0] or 'user')[:140]
    username = base_username
    if User.objects.filter(username=username).exists():
        username = f'{base_username}-{secrets.token_hex(3)}'
    user = User.objects.create_user(username=username, email=email, password=password)
    Profile.objects.create(user=user, display_name=display_name)
    login(request, user)
    return Response({'user': _self_payload(user)})


@api_view(['POST'])
@permission_classes([AllowAny])
@rate_limit(key='login', max_attempts=30, window=600)
def login_view(request):
    SessionAuthentication().enforce_csrf(request)
    s = LoginSerializer(data=request.data)
    s.is_valid(raise_exception=True)
    email = s.validated_data['email'].lower()
    password = s.validated_data['password']
    # autentica pelo email
    user = User.objects.filter(email__iexact=email).first()
    if not user:
        return Response({'error': 'invalid_credentials'}, status=401)
    user = authenticate(request, username=user.username, password=password)
    if not user:
        return Response({'error': 'invalid_credentials'}, status=401)
    login(request, user)
    # zera o contador de tentativas após login OK
    reset_rate_limit('login', request=request)
    return Response({'user': _self_payload(user)})


@api_view(['POST'])
@permission_classes([AllowAny])
def logout_view(request):
    logout(request)
    return Response({'ok': True})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def me(request):
    return Response({'user': _self_payload(request.user)})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@rate_limit(key='change_password', max_attempts=10, window=600, per_user=True)
def change_password(request):
    """Troca a própria senha: {currentPassword, newPassword}. Desliga a troca
    obrigatória e mantém esta sessão aberta (as outras caem)."""
    user = request.user
    current = request.data.get('currentPassword') or ''
    new = request.data.get('newPassword') or ''
    if not isinstance(current, str) or not user.check_password(current):
        return Response({'error': 'wrong_password'}, status=400)
    if new == current:
        return Response({'error': 'same_password'}, status=400)
    problem = password_problem(new, user)
    if problem:
        return Response({'error': problem}, status=400)
    set_own_password(user, new)
    update_session_auth_hash(request, user)
    return Response({'user': _self_payload(user)})
