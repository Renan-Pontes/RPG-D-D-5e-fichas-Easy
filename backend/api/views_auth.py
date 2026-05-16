"""
Views de autenticação. Sessão Django + CSRF + endpoint que entrega o cookie
inicial de CSRF para o frontend pegar.
"""
import secrets
from django.contrib.auth import authenticate, login, logout, get_user_model
from django.middleware.csrf import get_token
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from .models import Profile
from .serializers import SignupSerializer, LoginSerializer, UserSerializer
from .rate_limit import rate_limit, reset_rate_limit

User = get_user_model()


@api_view(['GET'])
@permission_classes([AllowAny])
def csrf(request):
    """Garante que o cookie de CSRF é enviado ao cliente. Frontend chama no boot."""
    token = get_token(request)
    return Response({'csrfToken': token})


@api_view(['POST'])
@permission_classes([AllowAny])
@rate_limit(key='signup', max_attempts=5, window=600)
def signup(request):
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
    return Response({'user': UserSerializer(user).data})


@api_view(['POST'])
@permission_classes([AllowAny])
@rate_limit(key='login', max_attempts=10, window=600)  # 10 tentativas a cada 10 min por IP
def login_view(request):
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
    return Response({'user': UserSerializer(user).data})


@api_view(['POST'])
@permission_classes([AllowAny])
def logout_view(request):
    logout(request)
    return Response({'ok': True})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def me(request):
    return Response({'user': UserSerializer(request.user).data})
