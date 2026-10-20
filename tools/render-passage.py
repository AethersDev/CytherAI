# The passage: under the visitor's scroll, the film's final composition opens into ADII's scene. Twelve seconds,
# scrubbed by scrolling on the front door (js/film.js), never played.
# blender -b --factory-startup <dir>/film-<l|p>.blend --python-exit-code 1 -P tools/render-passage.py -- <l|p> <stills|anim> <outdir> <WxH> <samples> [t1,t2,...]
# The .blend is the film's own scene, written by `tools/render-film.py -- <l|p> blend <dir> <film's WxH> <samples>`, so the
# passage begins on the film's last frame (288) and continues one world; the film's script is not touched.
# (Environment: TL, seconds per frame for Cycles, as the film's.)
#
# What it shows (premise ledger: docs/asset-promotion-log.md, PASSAGE): the camera moves into the plane of the ring the
# refused slab never crossed, so the ring narrows to a line that stays where it stood; the structure parts around it and
# leaves a run of its ceramic tiles standing, which come forward as a row of values, one visibly wrong (the recorded
# run's last day, about half its neighbours). A correction arrives from the proposing side and stops a fraction short of
# the line, as the refused slab did. Two separate checks examine it, as adii/ states: the authorizer's (the change is
# within what ADII may change: the slot lights) and the validator's (the data rebuilt with the change: a scan runs the
# row and the slot holds). Only then does it cross; the wrong value steps back behind it, kept, not erased.
import bpy, math, os, sys
from mathutils import Vector, Matrix, Quaternion

args = sys.argv[sys.argv.index('--') + 1:]
ORIENT, MODE, OUT = args[0], args[1], args[2]
if ORIENT not in ('l', 'p') or MODE not in ('stills', 'anim'): raise SystemExit('usage: -- <l|p> <stills|anim> <outdir> <WxH> <samples> [t1,...]')
W, H = (int(x) for x in args[3].split('x'))
SPP = int(args[4])
TIMES = [float(x) for x in args[5].split(',')] if MODE == 'stills' else []
PORTRAIT = ORIENT == 'p'
scn = bpy.context.scene
FPS, F0, DUR = 24, 288, 12.0          # F0: the film's last frame, the passage's first
NP = int(DUR * FPS)
times = [n / FPS for n in range(NP)]  # passage seconds of frames F0 .. F0 + NP - 1
if scn.frame_end != F0 or bpy.data.objects.get('hero') is None: raise SystemExit('open the film\'s own scene: tools/render-film.py -- <l|p> blend …')

def ss(a, b, t):
    x = min(1.0, max(0.0, (t - a) / (b - a))); return x * x * (3 - 2 * x)

# ---------- keys: the film's own frames are kept; the passage's are added after them ----------
def fcurve(idobj, path, index):
    ad = idobj.animation_data or idobj.animation_data_create()
    if ad.action is None:
        act = bpy.data.actions.new(idobj.name); ad.action = act
        ad.action_slot = act.slots.new(idobj.id_type, idobj.name); act.layers.new('L').strips.new(type='KEYFRAME')
    cb = ad.action.layers[0].strips[0].channelbag(ad.action_slot, ensure=True)
    return cb.fcurves.find(path, index=index) or cb.fcurves.new(path, index=index)
def key(idobj, path, series):
    """series[n]: the value at frame F0 + n; a frame the film already keys keeps the film's value"""
    for c in range(len(series[0])):
        fc = fcurve(idobj, path, c)
        have = {round(p.co[0]) for p in fc.keyframe_points}
        new = [(F0 + n, s[c]) for n, s in enumerate(series) if F0 + n not in have]
        k = len(fc.keyframe_points); fc.keyframe_points.add(len(new))
        for i, co in enumerate(new): fc.keyframe_points[k + i].co = co
        fc.update()
def key_pose(o, mats):
    locs, quats, prev = [], [], None
    for m in mats:
        q = m.to_quaternion()
        if prev is not None and prev.dot(q) < 0: q = -q
        prev = q; locs.append(tuple(m.to_translation())); quats.append(tuple(q))
    o.rotation_mode = 'QUATERNION'; key(o, 'location', locs); key(o, 'rotation_quaternion', quats); key(o, 'scale', [tuple(m.to_scale()) for m in mats])

scn.frame_set(F0)
ROOT, ORDER = bpy.data.objects['ROOT'], bpy.data.objects['ORDER']
TO_ROOT = ROOT.matrix_world.inverted()
scn.frame_start, scn.frame_end = F0, F0 + NP - 1
scn.render.resolution_x, scn.render.resolution_y = W, H

# ---------- the structure parts around the line ----------
PART, SPREAD = (1.2, 4.4), 9.0
VALUES = 15                                  # the recorded run's chart: 2026-08-04 .. 2026-08-18, the last day wrong
TILES = [bpy.data.objects['tile%d_6' % (28 + i)] for i in range(VALUES)]   # the run of tiles the structure leaves standing
STAYS = {'hero', 'plane', 'rim', 'current', 'channel'}
LEFT = bpy.data.objects.new('LEFT', None); RIGHT = bpy.data.objects.new('RIGHT', None)
for e in (LEFT, RIGHT): e.parent = ROOT; scn.collection.objects.link(e)
for o in list(ROOT.children):              # the ordered side and the group that passed go right; the rest, and the
    if o in (LEFT, RIGHT) or o.name in STAYS: continue   # group's tiles straddling the plane, go left
    o.parent = RIGHT if o is ORDER or (TO_ROOT @ o.matrix_world).translation.x >= 0.5 else LEFT
for o in TILES:                              # left standing: out of ORDER, at the place the film left them
    m = TO_ROOT @ o.matrix_world; o.parent = ROOT; o.matrix_basis = m
key(LEFT, 'location', [(-SPREAD * ss(*PART, t), 0, 0) for t in times])
key(RIGHT, 'location', [(SPREAD * ss(*PART, t), 0, 0) for t in times])

# ---------- the row of values ----------
X0, DX, BW, Y_ROW, Z_B = 0.45, 0.5, 0.28, -2.2, 0.5   # the row stands above the current, which runs below it
TYPICAL = [0.93, 0.96, 0.94, 0.97, 0.95, 0.92, 0.95, 0.96, 0.93, 0.96, 0.95, 0.94, 0.97, 0.95]   # the fourteen days before, flat
HEIGHT = [0.47] + TYPICAL                    # slot 0, at the line, is the last day: about half (the run's −51 %)
FACING = Matrix(((0, 0, 1), (-1, 0, 0), (0, -1, 0)))   # columns: radial → −y (to the camera), tangential → −z, axial → +x
def forward_at(i):
    """a tile may come forward once the structure's nearest fin (the group's, x 0.56 at rest) has passed it"""
    x = TILES[i].matrix_basis.translation.x + 0.21 + 0.15
    lo, hi = PART
    for n in range(2000):
        t = lo + (hi - lo) * n / 2000
        if 0.56 + SPREAD * ss(*PART, t) > x: return t
    return hi
for i, o in enumerate(TILES):
    m0 = o.matrix_basis.copy(); p0, q0 = m0.to_translation(), m0.to_quaternion()
    p1 = Vector((X0 + DX * i, Y_ROW, Z_B + HEIGHT[i] / 2)); q1 = FACING.to_quaternion()
    if q0.dot(q1) < 0: q1 = -q1
    a = max(forward_at(i), 3.0 + 0.08 * i); b = a + 1.6
    mats = []
    for t in times:
        u = ss(a, b, t); g = ss(a + 0.4, b + 0.3, t)            # it turns and comes forward, then rises to its value
        p = p0.lerp(p1, u); p.z = p0.z + (p1.z - p0.z) * g
        back = ss(10.4, 11.0, t) if i == 0 else 0.0             # the wrong value steps back and shrinks as the correction comes in:
        p.y += 0.25 * back                                      # kept behind it, not erased, and hidden by it from either camera
        k = 1 - 0.2 * back
        mats.append(Matrix.Translation(p) @ q0.slerp(q1, u).to_matrix().to_4x4() @ Matrix.Diagonal((k, k * (1 + (HEIGHT[i] / 0.55 - 1) * g), k * (1 + (BW / 0.42 - 1) * u), 1)))
    key_pose(o, mats)

# ---------- the correction, the checks ----------
def box(name, sx, sy, sz, mat):
    bpy.ops.mesh.primitive_cube_add(size=1); tmp = bpy.context.object; me = tmp.data; bpy.data.objects.remove(tmp)
    for v in me.vertices: v.co.x *= sx; v.co.y *= sy; v.co.z *= sz
    me.materials.append(mat); o = bpy.data.objects.new(name, me); o.parent = ROOT; scn.collection.objects.link(o)
    return o
def glow(name, color, sx, sy, sz):
    """a line of light; strength 0 is no line at all (emission mixed with transparency, the mix keyed with it)"""
    m = bpy.data.materials.new(name); m.use_nodes = True
    nt = m.node_tree; nt.nodes.remove(nt.nodes['Principled BSDF'])
    e = nt.nodes.new('ShaderNodeEmission'); e.name = 'Emission'; e.inputs['Color'].default_value = color
    tr = nt.nodes.new('ShaderNodeBsdfTransparent'); mix = nt.nodes.new('ShaderNodeMixShader'); mix.name = 'Mix'
    nt.links.new(tr.outputs[0], mix.inputs[1]); nt.links.new(e.outputs[0], mix.inputs[2])
    nt.links.new(mix.outputs[0], nt.nodes['Material Output'].inputs['Surface'])
    return box(name, sx, sy, sz, m), m
def light_up(mat, series):
    key(mat.node_tree, 'nodes["Emission"].inputs[1].default_value', [(s,) for s in series])
    key(mat.node_tree, 'nodes["Mix"].inputs[0].default_value', [(min(1.0, s * 4),) for s in series])
HC = 0.95                                     # the corrected value: level with the days before
fix = box('correction', BW, 0.05, HC, bpy.data.materials['hero'])   # the refused slab's own pale
WAIT = -0.14 - BW / 2                          # its leading edge a fraction short of the line, where the refused slab stopped
ARRIVE, CROSS = (6.8, 8.0), (10.7, 11.4)
FROM = -6.5                                   # where it comes from: off frame, and clear of the structure, which has parted
def fix_x(t): return FROM + (WAIT - FROM) * (1 - (1 - min(1.0, max(0.0, (t - ARRIVE[0]) / (ARRIVE[1] - ARRIVE[0])))) ** 3) + (X0 - WAIT) * ss(*CROSS, t)
key(fix, 'location', [(fix_x(t), Y_ROW, Z_B + HC / 2) for t in times])
key(fix, 'scale', [((1, 1, 1) if t >= ARRIVE[0] - 0.1 else (0, 0, 0)) for t in times])   # it exists from its arrival, not inside the film's structure
# the authorizer: the slot it may change lights, traced from the line's side (warm, the ring's light)
WARM_LIGHT = (1, 0.72, 0.45, 1)
R, YL = 0.006, Y_ROW - 0.06
SLOT = (X0 - BW / 2 - 0.05, X0 + BW / 2 + 0.05, Z_B - 0.05, Z_B + HC + 0.05)
sides = [((SLOT[0], SLOT[2]), (SLOT[0], SLOT[3])), ((SLOT[0], SLOT[3]), (SLOT[1], SLOT[3])),
         ((SLOT[1], SLOT[3]), (SLOT[1], SLOT[2])), ((SLOT[1], SLOT[2]), (SLOT[0], SLOT[2]))]
AUTH, VAL = (8.2, 9.2), (9.3, 10.5)
for n, ((xa, za), (xb, zb)) in enumerate(sides):
    rod, mat = glow('authorizer%d' % n, WARM_LIGHT, 1, 1, 1)
    L = math.hypot(xb - xa, zb - za)
    s0, s1 = AUTH[0] + 0.25 * n, AUTH[0] + 0.25 * (n + 1)
    def at(t, xa=xa, za=za, xb=xb, zb=zb, L=L, s0=s0, s1=s1):
        u = min(1.0, max(0.0, (t - s0) / (s1 - s0))); l = max(1e-4, L * u)
        mx, mz = xa + (xb - xa) * u / 2, za + (zb - za) * u / 2
        return (mx, YL, mz), ((l, 2 * R, 2 * R) if abs(zb - za) < 1e-6 else (2 * R, 2 * R, l))
    key(rod, 'location', [at(t)[0] for t in times]); key(rod, 'scale', [at(t)[1] for t in times])
    light_up(mat, [6.0 * ss(s0 - 0.05, s0, t) * (1 - 0.55 * ss(AUTH[1], AUTH[1] + 0.4, t) + 0.55 * ss(VAL[1] - 0.1, VAL[1] + 0.1, t)) * (1 - ss(11.1, 11.7, t)) for t in times])
# the validator: the data rebuilt with the change, a scan leaving the line and running the row (cool, the key light's);
# once it has run, the slot holds (the authorizer's light rises with it)
scan, smat = glow('validator', (0.8, 0.86, 1.0, 1), 2 * R, 2 * R, HC + 0.4)
def scan_x(t):                                # steady across the values in view, then on along the rest of the row
    return 0.04 + 2.36 * min(1.0, max(0.0, (t - VAL[0]) / (VAL[1] - 0.4 - VAL[0]))) + (DX * (VALUES - 1) + 0.4 - 2.0) * ss(VAL[1] - 0.4, VAL[1], t)
key(scan, 'location', [(scan_x(t), YL - 0.03, Z_B + HC / 2) for t in times])   # in front of the slot's frame: lines of light pass, never meet
light_up(smat, [6.0 * ss(VAL[0] - 0.1, VAL[0] + 0.05, t) * (1 - ss(VAL[1] - 0.15, VAL[1], t)) for t in times])

# ---------- the world keeps time; the ring keeps its light ----------
key(bpy.data.materials['current'].node_tree, 'nodes["T"].outputs[0].default_value', [((F0 - 1 + n) / FPS,) for n in range(NP)])
key(bpy.data.materials['rim'].node_tree, 'nodes["Emission"].inputs[1].default_value', [(0.71 + 1.3 * ss(0.4, 2.6, t),) for t in times])
cnt = bpy.data.materials['current'].node_tree
pulse = next(n for n in cnt.nodes if n.type == 'MATH' and n.operation == 'MULTIPLY_ADD' and abs(n.inputs[1].default_value - 16.0) < 1e-6)
dim = [1 - 0.4 * ss(2.0, 5.0, t) for t in times]   # the current's strength, 16 per pulse over 4, dims once it is seen bare
key(cnt, 'nodes["%s"].inputs[1].default_value' % pulse.name, [(16.0 * d,) for d in dim])
key(cnt, 'nodes["%s"].inputs[2].default_value' % pulse.name, [(4.0 * d,) for d in dim])

# ---------- the camera: into the ring's plane, then in, the line held where the ring stood ----------
cam = bpy.data.objects['cam']; camd = cam.data
C0, Q0 = cam.matrix_world.to_translation(), cam.matrix_world.to_quaternion()
def project(c, q, p):
    """(u, v): p's place in the frame, 0..1 from the left and the bottom, with no shift"""
    pc = q.to_matrix().inverted() @ (Vector(p) - c); k = camd.lens / camd.sensor_width
    a, b = k * pc.x / -pc.z, k * pc.y / -pc.z
    return (0.5 + a, 0.5 + b * W / H) if W >= H else (0.5 + a * H / W, 0.5 + b)
CENTRE = ROOT.matrix_world @ Vector((0, 0, 0))
U0 = project(C0, Q0, CENTRE)                 # where the ring stood when the film ended
if PORTRAIT:
    KEYS = [(0, None, None), (2.6, (0, -14.5, 0), (0, 0, 0)), (4.6, (-0.1, -10.0, 0), (-0.1, 0, 0)), (6.2, (-0.2, -7.0, 0), (-0.2, 0, 0)),
            (7.8, (-0.15, -6.7, 0), (-0.15, 0, 0)), (12, (-0.15, -6.7, 0), (-0.15, 0, 0))]
else:
    KEYS = [(0, None, None), (2.6, (0, -15.5, 2.6), (0, 0, 0.3)), (4.6, (0, -11.0, 1.6), (0, 0, 0.9)), (6.2, (0, -6.5, 1.0), (0, 0, 1.0)),
            (7.8, (0, -5.95, 1.0), (0, 0, 1.0)), (12, (0, -5.65, 1.0), (0, 0, 1.0))]
L0 = C0 + Q0 @ Vector((0, 0, -(camd.dof.focus_distance)))
KEYS[0] = (0, tuple(C0), tuple(L0))
def spline(t, idx):
    ts = [k[0] for k in KEYS]; ps = [Vector(k[idx]) for k in KEYS]
    i = max(0, min(len(ts) - 2, next((n for n in range(len(ts) - 1) if t < ts[n + 1]), len(ts) - 2)))
    h = ts[i + 1] - ts[i]; u = min(1.0, max(0.0, (t - ts[i]) / h))
    m0 = (ps[i + 1] - ps[i - 1]) / (ts[i + 1] - ts[i - 1]) * h if i > 0 else Vector((0, 0, 0))
    m1 = (ps[i + 2] - ps[i]) / (ts[i + 2] - ts[i]) * h if i + 2 < len(ts) else Vector((0, 0, 0))
    return (2 * u**3 - 3 * u**2 + 1) * ps[i] + (u**3 - 2 * u**2 + u) * m0 + (-2 * u**3 + 3 * u**2) * ps[i + 1] + (u**3 - u**2) * m1
IN = (0.25, 2.6)                             # held a moment on the film's last frame, then into the plane
locs, quats, shifts, focus, prev = [], [], [], [], None
for t in times:
    w = 1 - ss(*IN, t)                       # the camera's distance from the plane, as a fraction of where the film left it
    p, tg = spline(t, 1), spline(t, 2)
    if PORTRAIT: p.z, tg.z = C0.z * w, L0.z * w + (1 - w) * p.z   # level, and in the plane z = 0
    else: p.x, tg.x = C0.x * w, L0.x * w
    q = (tg - p).to_track_quat('-Z', 'Y')
    if prev is not None and prev.dot(q) < 0: q = -q
    prev = q
    u, v = project(p, q, CENTRE)             # the lens shift that keeps the ring's centre where it stood
    rise = 0.0 if PORTRAIT else -0.085 * ss(3.0, 6.0, t)   # the frame lowered: the row above the band the words take
    shifts.append(((u - U0[0]) if not PORTRAIT else 0.0, (v - U0[1]) if PORTRAIT else rise))
    f_row = (ROOT.matrix_world @ Vector((X0, Y_ROW, 0.6)) - p).length
    locs.append(tuple(p)); quats.append(tuple(q)); focus.append(((tg - p).length + (f_row - (tg - p).length) * ss(3.0, 5.0, t),))
key(cam, 'location', locs); key(cam, 'rotation_quaternion', quats)
near0 = None; thin = []
for p in locs:                               # the ring seen edge on is its nearest arc: thinned along its axis as the camera
    ps = TO_ROOT @ Vector(p)                 # nears it, so the line keeps the width it had when the film ended
    near = math.hypot(math.hypot(ps.y, ps.z) - 3.5, ps.x)
    near0 = near0 or near; thin.append((1, 1, max(0.08, min(1.0, near / near0))))
key(bpy.data.objects['rim'], 'scale', thin)
axis0 = None; narrow = []
for p in locs:                               # so do the current and its glass: thinned about the axis as the camera nears
    ps = TO_ROOT @ Vector(p); d = math.hypot(ps.y, ps.z)
    axis0 = axis0 or d; k = max(0.25, min(1.0, d / axis0)); narrow.append((k, k, 1))
for n in ('current', 'channel'): key(bpy.data.objects[n], 'scale', narrow)
# the row's light: a soft lamp in front of it, up as the row forms, so the values read pale
lamp = bpy.data.lights.new('reading', 'AREA'); lamp.size = 6; lamp.color = (0.9, 0.93, 1.0)
lo = bpy.data.objects.new('reading', lamp); scn.collection.objects.link(lo)
lo.location = ROOT.matrix_world @ Vector((1.5, -9.0, 4.0))
lo.rotation_mode = 'QUATERNION'; lo.rotation_quaternion = (ROOT.matrix_world @ Vector((1.5, Y_ROW, Z_B + 0.5)) - lo.location).to_track_quat('-Z', 'Y')
key(lamp, 'energy', [(900.0 * ss(4.0, 6.0, t),) for t in times])
key(camd, 'shift_x', [(s[0],) for s in shifts]); key(camd, 'shift_y', [(s[1],) for s in shifts])
key(camd, 'dof.focus_distance', focus)

# ---------- render (the film's settings, carried in its scene) ----------
pr = bpy.context.preferences.addons['cycles'].preferences; pr.compute_device_type = 'METAL'; pr.get_devices()
for d in pr.devices: d.use = d.type == 'METAL'
scn.cycles.samples = SPP
scn.cycles.time_limit = float(os.environ.get('TL', 0))
if MODE == 'stills':
    for t in TIMES:
        scn.frame_set(F0 + int(round(t * FPS))); scn.render.filepath = '%s/t%05.2f.png' % (OUT, t); bpy.ops.render.render(write_still=True)
else:
    scn.render.filepath = OUT + '/f'; bpy.ops.render.render(animation=True)
