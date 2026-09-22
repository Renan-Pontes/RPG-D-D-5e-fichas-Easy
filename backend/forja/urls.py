from django.contrib import admin
from django.urls import path, include, re_path
from django.http import JsonResponse, FileResponse, Http404
from django.conf import settings


def health(_request):
    return JsonResponse({'ok': True})


def frontend(_request):
    index = settings.FRONTEND_DIST / 'index.html'
    if not index.is_file():
        raise Http404('Build the frontend first.')
    response = FileResponse(index.open('rb'), content_type='text/html')
    response['Cache-Control'] = 'no-cache'
    return response


urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/health', health),
    path('api/', include('api.urls')),
    re_path(r'^(?!api(?:/|$)|admin(?:/|$)|static(?:/|$)|assets(?:/|$)).*$', frontend),
]
