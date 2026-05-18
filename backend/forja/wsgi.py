"""
WSGI config para PythonAnywhere e qualquer servidor WSGI padrão.

No PythonAnywhere, edite o arquivo WSGI deles para importar `application`
deste módulo. Ver DEPLOY.md.
"""
import os
from django.core.wsgi import get_wsgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'forja.settings')
application = get_wsgi_application()
