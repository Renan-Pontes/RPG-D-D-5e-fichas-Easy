import os
import sys

sys.path.insert(0, '/home/NGhetsis/forja/backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'forja.settings')
from django.core.wsgi import get_wsgi_application
application = get_wsgi_application()
