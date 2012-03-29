#!/usr/bin/env python

# to run the sparq server
# $ ./sparq --interactive --port 4443

import os
import re
import sys
import json
import socket


def abspath(*relpath):
    """gets a relative path and returns an absolute path based on the
    path of this file"""
    currdir = os.path.dirname(os.path.abspath(__file__))
    return os.path.join(currdir, *relpath)


def read_scene(name):
    """gets a scene name and returns an object with the scene data"""
    with open(abspath('scenes', name, 'data.json')) as data:
        return json.load(data)


class SparQ(object):
    """connection to a sparq server"""

    def __init__(self, host, port):
        self.sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        self.sock.connect((host, port))
        self.sockfile = self.sock.makefile('rw')

    def sendline(self, line):
        """Send a line to the server."""
        self.sock.send(line + '\r\n')  # unbuffered write

    def readline(self):
        """Read a line from the server. Ignore empty lines and comments, and
        strip the SparQ prompt."""
        line = self.sockfile.readline()
        if not line:
            raise EOFError()
        if line.isspace() or re.search(r'^\s*;', line):
            return self.readline()
        else:
            return re.search(r'^(?:sparq>)?\s*(.+)\s*$', line, re.I).group(1)

    def quit(self):
        """send quit message to server"""
        self.sendline('quit')
        self.readline()
        self.sock.close()

    def qualify(self, calculus, scene, opt='all'):
        """determine qualitative configuration from quantitative scene
        description"""
        self.sendline('qualify %(calculus)s %(opt)s %(scene)s' % {
            'calculus': calculus,
            'scene': str(scene),
            'opt': opt,
        })
        return self.readline()


class SparQEntity(object):
    def __str__(self):
        return self.dump()
    def __repr__(self):
        return '<%s: %s>' % (self.__class__.__name__, str(self))


class QuantitativeSceneDescription(SparQEntity):
    def __init__(self):
        self.entities = {}

    def dump(self):
        return '(%s)' % ' '.join(e.dump(n) for n,e in self.entities.items())

    def add_entity(self, name, entity):
        self.entities[name] = entity


class QualitativeSceneDescription(SparQEntity):
    pass


class Point1(SparQEntity):
    def __init__(self, x):
        self.x = x

    def dump(self, name='?'):
        return '(%s %s)' % (name, self.x)


class Interval(SparQEntity):
    def __init__(self, a, b):
        self.a = a
        self.b = b

    def dump(self, name='?'):
        return '(%s %s %s)' % (name, self.a, self.b)


class Point2(SparQEntity):
    def __init__(self, x, y):
        self.x = x
        self.y = y

    def dump(self, name='?'):
        return '(%s %s %s)' % (name, self.x, self.y)


class OrientedPoint(SparQEntity):
    def __init__(self, x, y, dx, dy):
        self.x = x
        self.y = y
        self.dx = dx
        self.dy = dy

    def dump(self, name='?'):
        return '(%s %s %s %s %s)' % (name, self.x, self.y, self.dx, self.dy)


class Dipole(SparQEntity):
    def __init__(self, sx, sy, ex, ey):
        self.sx = sx
        self.sy = sy
        self.ex = ex
        self.ey = ey

    def dump(self, name='?'):
        return '(%s %s %s %s %s)' % (name, self.sx, self.sy, self.ex, self.ey)


def get_intervals(scene, axis):
    """get a `QuantitativeSceneDescription` with intervals in `axis`
    from the aabb of each element in `scene`"""
    qsd = QuantitativeSceneDescription()
    for i, obj in enumerate(scene):
        if obj['type'] == 'perspective_camera':
            continue
        name = '%s%s' % (obj['type'], i)
        aabb = obj['aabb']
        qsd.add_entity(name, Interval(aabb['min'][axis], aabb['max'][axis]))
    return qsd


def get_positions(scene, plane):
    """get a `QuantitativeSceneDescription` with the 2d positions in `plane`
    of each element in `scene`"""
    qsd = QuantitativeSceneDescription()
    for i, obj in enumerate(scene):
        name = '%s%s' % (obj['type'], i)
        pos = obj['position']        
        qsd.add_entity(name, Point2(pos[plane[0]], pos[plane[1]]))
    return qsd



if __name__ == '__main__':
    sparq = SparQ('localhost', 4443)
    scene = read_scene(sys.argv[1])

    ints_x = get_intervals(scene, 'x')
    ints_y = get_intervals(scene, 'y')
    ints_z = get_intervals(scene, 'z')

    pts_xy = get_positions(scene, 'xy')
    pts_xz = get_positions(scene, 'xz')
    pts_yz = get_positions(scene, 'yz')

    print 'interval calculus (x)'
    print sparq.qualify('allen', ints_x)
    print

    print 'interval calculus (y)'
    print sparq.qualify('allen', ints_y)
    print

    print 'interval calculus (z)'
    print sparq.qualify('allen', ints_z)
    print

    print 'cardinal direction calculus (xy)'
    print sparq.qualify('cardir', pts_xy)
    print

    print 'cardinal direction calculus (xz)'
    print sparq.qualify('cardir', pts_xz)
    print

    print 'cardinal direction calculus (yz)'
    print sparq.qualify('cardir', pts_yz)
    print

    print 'doublecross calculus (xy)'
    print sparq.qualify('dcc', pts_xy)
    print

    print 'doublecross calculus (xz)'
    print sparq.qualify('dcc', pts_xz)
    print

    print 'doublecross calculus (yz)'
    print sparq.qualify('dcc', pts_yz)
    print

    print 'alternative doublecross calculus (xy)'
    print sparq.qualify('adcc', pts_xy)
    print

    print 'alternative doublecross calculus (xz)'
    print sparq.qualify('adcc', pts_xz)
    print

    print 'alternative doublecross calculus (yz)'
    print sparq.qualify('adcc', pts_yz)
    print

    print 'flipflop calculus (xy)'
    print sparq.qualify('ffc', pts_xy)
    print

    print 'flipflop calculus (xz)'
    print sparq.qualify('ffc', pts_xz)
    print

    print 'flipflop calculus (yz)'
    print sparq.qualify('ffc', pts_yz)
    print

    print 'singlecross calculus (xy)'
    print sparq.qualify('scc', pts_xy)
    print

    print 'singlecross calculus (xz)'
    print sparq.qualify('scc', pts_xz)
    print

    print 'singlecross calculus (yz)'
    print sparq.qualify('scc', pts_yz)
    print

    print 'relative distance calculus (xy)'
    print sparq.qualify('reldistcalculus', pts_xy)
    print

    print 'relative distance calculus (xz)'
    print sparq.qualify('reldistcalculus', pts_xz)
    print

    print 'relative distance calculus (yz)'
    print sparq.qualify('reldistcalculus', pts_yz)
    print

    sparq.quit()
