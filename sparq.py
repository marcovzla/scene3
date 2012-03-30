#!/usr/bin/env python

# to run the sparq server
# $ ./sparq --interactive --port 4443

import os
import re
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
        return QualitativeSceneDescription(calculus, self.readline())


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
    def __init__(self, calculus, data):
        self.calculus = calculus
        self.data = data
        self.predicates = []

        # parse data
        data = self.data[1:-1].strip()
        while True:
            match = re.search(r'^\(([^)]*)\)\s*', data)
            if not match:
                break
            data = data[match.end():]
            parts = match.group(1).split()
            self.predicates.append(Predicate(calculus, parts))

    def dump(self, format='lisp'):
        if format == 'lisp':
            return self.data
        elif format == 'prolog':
            return '\n'.join('%s.'%p for p in self.predicates)


class Predicate(SparQEntity):
    def __init__(self, calculus, args):
        self.calculus = calculus
        self.name = args[-2].lower()
        self.args = tuple(a.lower() for a in args if a is not args[-2])

    def dump(self):
        return '%s_%s(%s)' % (self.calculus, self.name, ', '.join(self.args))


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
    scenes_dir = abspath('scenes')

    for scenename in os.listdir(scenes_dir):
        if scenename.startswith('.'):
            continue

        print 'processing', scenename
        scene = read_scene(scenename)
        pts_xy = get_positions(scene, 'xy')
        pts_xz = get_positions(scene, 'xz')
        pts_yz = get_positions(scene, 'yz')

        # write new data in scene directory
        dirname = os.path.join(scenes_dir, scenename)
        def write(filename, data):
            filename = os.path.join(dirname, filename)
            with open(filename, 'wb') as f:
                f.write(data)

        def write_data(calc, **scenes):
            for s in scenes:
                sd = sparq.qualify(calc, scenes[s])
                for f in ('lisp', 'prolog'):
                    write('%s_%s.%s'%(calc, s, f), sd.dump(f))

        print '\tinterval algebra'
        write_data('allen', x=get_intervals(scene, 'x'),
                            y=get_intervals(scene, 'y'),
                            z=get_intervals(scene, 'z'))

        print '\tcardinal direction calculus'
        write_data('cardir', xy=pts_xy, xz=pts_xz, yz=pts_yz)

        print '\tdoublecross calculus'
        write_data('dcc', xy=pts_xy, xz=pts_xz, yz=pts_yz)

        print '\talternative doublecross calculus'
        write_data('adcc', xy=pts_xy, xz=pts_xz, yz=pts_yz)

        print '\tflipflop calculus'
        write_data('ffc', xy=pts_xy, xz=pts_xz, yz=pts_yz)

        print '\tsinglecross calculus'
        write_data('scc',  xy=pts_xy, xz=pts_xz, yz=pts_yz)

        print '\trelative distance calculus'
        write_data('reldistcalculus',  xy=pts_xy, xz=pts_xz, yz=pts_yz)

    sparq.quit()
