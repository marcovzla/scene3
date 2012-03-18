#!/usr/bin/env python

import re
import os
import base64
import mimetypes
from bottle import route, run, static_file, redirect, request, post

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
    data = request.POST.get('data').strip()
    match = re.search(r'^data:(?P<mimetype>[^;]+);base64,(?P<data>.+)$', dataurl)
    if match:
        # create directory to store scene
        dirname = abspath('scenes', name)
        if not os.path.exists(dirname):
            os.makedirs(dirname)

        # save image
        ext = mimetypes.guess_extension(match.group('mimetype'))
        imagename = os.path.join(dirname, 'snapshot' + ext)
        with open(imagename, 'wb') as image:
            image.write(base64.b64decode(match.group('data')))

        dataname = os.path.join(dirname, 'data.json')
        with open(dataname, 'wb') as datafile:
            datafile.write(data)

if __name__ == '__main__':
    mimetypes.init()
    run(host='localhost', port=8080)
