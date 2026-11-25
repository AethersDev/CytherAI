# The passage: under the visitor's scroll, the film's final composition opens into ADII's scene, then AWC-OS's and
# CytherCAD's, and returns to the film's own view. Twenty-five seconds, scrubbed by scrolling on the front door
# (js/film.js), never played. Its first twelve, ADII's, were rendered first (2026-10-20) and are kept: nothing here
# changes a frame before 12.0 s, so the rest is rendered from there on (FROM) and joined to them.
# blender -b --factory-startup <dir>/film-<l|p>.blend --python-exit-code 1 -P tools/render-passage.py -- <l|p> <stills|anim> <outdir> <WxH> <samples> [t1,t2,...]
# (Environment: FROM, the passage second an anim render starts at: 12 renders what followed ADII's, frames 576 on.)
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
# AWC-OS (awc-os/: EXECUTED · REFUSED · BLOCKED; a refusal with a permitted alternative; no rule relaxed): the camera
# rises along the line and ADII's row sinks away; the rule is an opening on the line, two lit jaws that never move; a
# program too tall for it stops a fraction short, its light goes out and it is set aside, and its alternative, lower,
# passes through the same opening. CytherCAD (pages/brief.html): that shape, come to rest, is built into a part, a block
# with a step and a bore, which turns to show them while its dimensions settle; the refused program turns back out of the
# frame. The page introduces CytherCAD before the shape takes any form: a shared principle, not a pipeline.
# Then the camera returns to where the film ended, out of the plane, so the line is the ring again; the structure closes
# back toward it with the three systems' work between, and what was refused stays short of it.
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
FPS, F0, DUR = 24, 288, 25.0          # F0: the film's last frame, the passage's first
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
CLOSE = (21.5, 24.5)                         # the close: the halves come back toward the line, short of the work between
key(LEFT, 'location', [(-SPREAD * ss(*PART, t) + 7.0 * ss(*CLOSE, t), 0, 0) for t in times])
key(RIGHT, 'location', [(SPREAD * ss(*PART, t) - 1.5 * ss(*CLOSE, t), 0, 0) for t in times])

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

# ---------- 02 AWC-OS: one fixed rule, one changed proposal ----------
YA, ZA, OPEN = 1.0, 2.3, 0.5                   # the lane: behind the axis, above ADII's row, inside the ring (r < 2.8 at the line), low
                                               # enough that the line runs out of the frame above the opening
def ease_out(a, b, t): x = min(1.0, max(0.0, (t - a) / (b - a))); return 1 - (1 - x) ** 3
for n, z in enumerate((ZA - OPEN / 2, ZA + OPEN / 2)):   # the rule: an opening on the line, lit as the camera reaches it
    jaw, jm = glow('rule%d' % n, WARM_LIGHT, 0.5, 2 * R, 2 * R); jaw.location = (0, YA, z)
    light_up(jm, [4.0 * ss(12.0, 12.4, t) for t in times])
def program(name, mat):                        # a proposed program: a plate with its light along its face
    o = box(name, 1, 1, 1, mat)
    strip, sm = glow(name + '-light', WARM_LIGHT, 1, 1, 1); strip.parent = o
    strip.location = (0, -0.6, 0.3); strip.scale = (0.75, 0.24, 0.06)   # in the plate's unit frame: its upper face
    return o, sm
P1W, P1H = 0.9, 0.72                           # refused: taller than the opening
p1, p1m = program('refused-program', bpy.data.materials['ceramic'])
P1STOP = -0.25 - 0.14 - P1W / 2                 # a fraction short of the jaws, as the refused slab stopped short of the plane
ASIDE = (0.0, 0.9, 0.75) if PORTRAIT else (0.8, 0.9, 0.65)   # back along the lane, away, up: set aside out of the lane as AWC-OS's
                                               # sequence set its refused program aside (on a phone back is down, into the words), and
                                               # beyond the reach of the structure's fins (r 3.08) when it closes
def p1_at(t):
    a = ss(14.2, 14.8, t)
    x = -7.0 + (P1STOP + 7.0) * ease_out(12.9, 13.9, t) - ASIDE[0] * a - 2.6 * ss(16.0, 17.6, t)   # then turned back,
    return (x, YA + ASIDE[1] * a, ZA + ASIDE[2] * a)                                               # out of the part's frame
key(p1, 'location', [p1_at(t) for t in times])
key(p1, 'scale', [((P1W, 0.05, P1H) if t >= 12.8 else (0, 0, 0)) for t in times])   # it exists from its arrival
light_up(p1m, [3.0 * (1 - ss(13.9, 14.2, t)) for t in times])    # refused: its light goes out

# ---------- 03 CytherCAD: the permitted shape becomes a part ----------
PX, PZ = 0.95, ZA + 0.15                       # the part's pivot: it turns about it to show the bore and the step
part = bpy.data.objects.new('PART', None); part.parent = ROOT; part.location = (PX, YA, PZ); scn.collection.objects.link(part)
part.rotation_mode = 'XYZ'
key(part, 'rotation_euler', [(0, 0, math.radians(28) * ss(18.4, 19.4, t)) for t in times])
P2W, P2H = 1.1, 0.34                           # permitted: lower than the opening, so it passes; then the part's base
BD, BH, SL, SH = 0.6, 0.4, 0.45, 0.32          # the base it becomes (as long as the program, deeper and taller), the step on its far end
BR, BX = 0.11, -0.25                           # the bore: its radius, and where it goes through the base
p2, p2m = program('permitted-program', bpy.data.materials['hero'])
p2.parent = part
def p2_at(t):                                  # local to the part: from far left, through the opening, to its place
    x = -7.0 + (PX + 7.0) * ease_out(14.3, 16.2, t)
    return (x - PX, 0, ZA - PZ)
key(p2, 'location', [p2_at(t) for t in times])
key(p2, 'scale', [((P2W, 0.05 + (BD - 0.05) * ss(16.0, 16.8, t), P2H + (BH - P2H) * ss(16.0, 16.8, t)) if t >= 14.2 else (0, 0, 0)) for t in times])
light_up(p2m, [3.0 * (1 - ss(16.0, 16.4, t)) for t in times])    # a plate no longer: its light gives way to the part
step = box('step', 1, 1, 1, bpy.data.materials['hero']); step.parent = part
for v in step.data.vertices: v.co.z += 0.5                         # it grows up from the base's top
key(step, 'location', [(P2W / 2 - SL / 2, 0, ZA + BH / 2 - PZ) for t in times])   # at the base's far end
key(step, 'scale', [((SL, BD, SH * max(1e-3, ss(16.8, 17.6, t))) if t >= 16.8 else (0, 0, 0)) for t in times])
bpy.ops.mesh.primitive_cylinder_add(radius=BR, depth=1.2, vertices=64); tmp = bpy.context.object; bore_mesh = tmp.data; bpy.data.objects.remove(tmp)
cutter = bpy.data.objects.new('bore', bore_mesh); cutter.parent = part; scn.collection.objects.link(cutter)
cutter.rotation_euler = (math.pi / 2, 0, 0); cutter.hide_render = True   # the drill: unseen, its cut seen
key(cutter, 'location', [(BX, -1.0 + 1.0 * ss(17.6, 18.4, t), ZA - PZ) for t in times])   # it drills the bore along y
bore = p2.modifiers.new('bore', 'BOOLEAN'); bore.operation = 'DIFFERENCE'; bore.object = cutter; bore.solver = 'EXACT'
COOL = (0.8, 0.86, 1.0, 1)
def dimension(name, a, b, at):                 # a measured span: a line with end ticks, drawn from its middle at t = at
    (xa, za), (xb, zb) = a, b
    flat = abs(zb - za) < 1e-6; L = math.hypot(xb - xa, zb - za)
    parts = [(((xa + xb) / 2, (za + zb) / 2), (L, 2 * R, 2 * R) if flat else (2 * R, 2 * R, L))]
    for (x, z) in (a, b):                      # the ticks, across the line
        parts.append(((x, z), (2 * R, 2 * R, 0.08) if flat else (0.08, 2 * R, 2 * R)))
    for k, ((x, z), size) in enumerate(parts):
        o, m = glow('%s%d' % (name, k), COOL, 1, 1, 1); o.parent = part
        o.location = (x - PX, -BD / 2 - 0.03, z - PZ)
        grow = [ss(at, at + 0.45, t) for t in times]
        key(o, 'scale', [tuple(max(1e-4, c * (g if (k == 0 and c == max(size)) else min(1.0, g * 2))) for c in size) for g in grow])
        light_up(m, [4.0 * g for g in grow])
base_lo, base_hi = PX - P2W / 2, PX + P2W / 2   # the base's span along the axis
dimension('length', (base_lo, ZA - BH / 2 - 0.1), (base_hi, ZA - BH / 2 - 0.1), 19.0)
dimension('height', (base_hi + 0.08, ZA - BH / 2), (base_hi + 0.08, ZA + BH / 2 + SH), 19.4)   # base and step
dimension('bore', (PX + BX - BR, ZA), (PX + BX + BR, ZA), 19.8)

# ---------- the world keeps time; the ring keeps its light ----------
key(bpy.data.materials['current'].node_tree, 'nodes["T"].outputs[0].default_value', [((F0 - 1 + n) / FPS,) for n in range(NP)])
key(bpy.data.materials['rim'].node_tree, 'nodes["Emission"].inputs[1].default_value', [(0.71 + 1.3 * ss(0.4, 2.6, t) * (1 - ss(*CLOSE, t)),) for t in times])
cnt = bpy.data.materials['current'].node_tree
pulse = next(n for n in cnt.nodes if n.type == 'MATH' and n.operation == 'MULTIPLY_ADD' and abs(n.inputs[1].default_value - 16.0) < 1e-6)
dim = [1 - 0.4 * ss(2.0, 5.0, t) * (1 - ss(*CLOSE, t)) for t in times]   # the current's strength, 16 per pulse over 4, dims
                                                                         # once it is seen bare, and is the film's again at the close
key(cnt, 'nodes["%s"].inputs[1].default_value' % pulse.name, [(16.0 * d,) for d in dim])
key(cnt, 'nodes["%s"].inputs[2].default_value' % pulse.name, [(4.0 * d,) for d in dim])

# ---------- the camera: into the ring's plane, then in, the line held where the ring stood; up it, in, and back out ----------
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
    LATER = [(12, (-0.15, -6.7, 0), (-0.15, 0, 0), 0), (13.2, (-2.35, -4.0, 0), (-2.35, 0, 0), 0), (16.0, (-2.35, -4.0, 0), (-2.35, 0, 0), 0),
             (18.0, (-3.2, -3.25, 0), (-2.6, 1.0, 0), 0), (21.0, (-3.2, -3.2, 0), (-2.6, 1.0, 0), 0)]
else:
    KEYS = [(0, None, None), (2.6, (0, -15.5, 2.6), (0, 0, 0.3)), (4.6, (0, -11.0, 1.6), (0, 0, 0.9)), (6.2, (0, -6.5, 1.0), (0, 0, 1.0)),
            (7.8, (0, -5.95, 1.0), (0, 0, 1.0)), (12, (0, -5.65, 1.0), (0, 0, 1.0))]
    LATER = [(12, (0, -5.65, 1.0), (0, 0, 1.0), 0), (13.2, (0, -4.4, 2.46), (0, 0, 2.46), 0), (16.0, (0, -4.4, 2.46), (0, 0, 2.46), 0),
             (18.0, (0, -3.75, 3.2), (0, 1.0, 2.6), 0), (21.0, (0, -3.7, 3.2), (0, 1.0, 2.6), 0)]
L0 = C0 + Q0 @ Vector((0, 0, -(camd.dof.focus_distance)))
KEYS[0] = (0, tuple(C0), tuple(L0))
LATER += [(CLOSE[1], tuple(C0), tuple(L0), 0), (DUR, tuple(C0), tuple(L0), 0)]   # the close: back where the film ended
def spline(t, idx, keys):
    """Catmull-Rom through the keys; a key's fourth value is its tension (0: the camera stops there; else 1)"""
    ts = [k[0] for k in keys]; ps = [Vector(k[idx]) for k in keys]; tn = [k[3] if len(k) > 3 else 1.0 for k in keys]
    i = max(0, min(len(ts) - 2, next((n for n in range(len(ts) - 1) if t < ts[n + 1]), len(ts) - 2)))
    h = ts[i + 1] - ts[i]; u = min(1.0, max(0.0, (t - ts[i]) / h))
    m0 = (ps[i + 1] - ps[i - 1]) / (ts[i + 1] - ts[i - 1]) * h * tn[i] if i > 0 else Vector((0, 0, 0))
    m1 = (ps[i + 2] - ps[i]) / (ts[i + 2] - ts[i]) * h * tn[i + 1] if i + 2 < len(ts) else Vector((0, 0, 0))
    return (2 * u**3 - 3 * u**2 + 1) * ps[i] + (u**3 - 2 * u**2 + u) * m0 + (-2 * u**3 + 3 * u**2) * ps[i + 1] + (u**3 - u**2) * m1
IN = (0.25, 2.6)                             # held a moment on the film's last frame, then into the plane
locs, quats, shifts, focus, prev = [], [], [], [], None
for t in times:
    if t <= 12:                              # ADII's, as first rendered
        w = 1 - ss(*IN, t)                   # the camera's distance from the plane, as a fraction of where the film left it
        p, tg = spline(t, 1, KEYS), spline(t, 2, KEYS)
        if PORTRAIT: p.z, tg.z = C0.z * w, L0.z * w + (1 - w) * p.z   # level, and in the plane z = 0
        else: p.x, tg.x = C0.x * w, L0.x * w
    else:                                    # on from rest: in the plane until the close takes it back out
        p, tg = spline(t, 1, LATER), spline(t, 2, LATER)
    q = (tg - p).to_track_quat('-Z', 'Y')
    if prev is not None and prev.dot(q) < 0: q = -q
    prev = q
    u, v = project(p, q, CENTRE)             # the lens shift that keeps the ring's centre where it stood
    rise = 0.0 if PORTRAIT else -0.085 * ss(3.0, 6.0, t) * (1 - ss(21.0, CLOSE[1], t))   # the frame lowered: the scene above the
                                                                                         # band the words take, the film's again at the close
    lift = -0.17 * ss(12.0, 13.2, t) * (1 - ss(16.0, 18.0, t))                 # on a phone the line rises for AWC-OS: the refused
                                                                               # program waits below it, above the words
    shifts.append(((u - U0[0]) if not PORTRAIT else 0.0, (v - U0[1] + lift) if PORTRAIT else rise))
    f_row = (ROOT.matrix_world @ Vector((X0, Y_ROW, 0.6)) - p).length
    f = (tg - p).length + (f_row - (tg - p).length) * ss(3.0, 5.0, t)            # ADII's row
    f += ((ROOT.matrix_world @ Vector((0.5, YA, ZA)) - p).length - f) * ss(12.0, 13.0, t)   # the lane, the part
    f += ((tg - p).length - f) * ss(21.0, CLOSE[1], t)                         # where the film looked
    locs.append(tuple(p)); quats.append(tuple(q)); focus.append((f,))
key(cam, 'location', locs); key(cam, 'rotation_quaternion', quats)
near0 = None; thin = []
for p in locs:                               # the ring seen edge on is its nearest arc: thinned along its axis as the camera
    ps = TO_ROOT @ Vector(p)                 # nears it, so the line keeps the width it had when the film ended
    near = math.hypot(math.hypot(ps.y, ps.z) - 3.5, ps.x)
    near0 = near0 or near; thin.append((1, 1, max(0.03, min(1.0, near / near0))))
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
else:                                       # FROM: render from that second on (the frames before it are kept)
    scn.frame_start = F0 + int(round(float(os.environ.get('FROM', 0)) * FPS))
    scn.render.filepath = OUT + '/f'; bpy.ops.render.render(animation=True)
