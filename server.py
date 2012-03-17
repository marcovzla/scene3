#!/usr/bin/env python

import re
import os
import base64
import mimetypes
from bottle import route, run, static_file, redirect, request, post

mimetypes.init()

def abspath(*relpath):
    currdir = os.path.dirname(os.path.abspath(__file__))
    return os.path.join(currdir, *relpath)

@route('/')
def index():
    redirect('/static/index.html')

@route('/static/<filename:path>')
def server_static(filename):
    return static_file(filename, root=abspath('static'))

@post('/savescene')
def save_scene():
    name = request.POST.get('name').strip()
    dataurl = request.POST.get('dataurl').strip()
    match = re.search(r'^data:(?P<mimetype>[^;]+);base64,(?P<data>.+)$', dataurl)
    if match:
        # create directory to store scene
        dirname = abspath('scenes', name)
        if not os.path.exists(dirname):
            os.makedirs(dirname)

        ext = mimetypes.guess_extension(match.group('mimetype'))
        filename = os.path.join(dirname, 'snapshot' + ext)
        with open(filename, 'wb') as screenshot:
            screenshot.write(base64.b64decode(match.group('data')))

run(host='localhost', port=8080)
