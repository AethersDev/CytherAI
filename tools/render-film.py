# Everything changes. One thing holds. — the 12-second film, built and rendered offline in Blender (Cycles, Metal).
# blender -b -P tools/render-film.py -- <l|p> <stills|anim|blend> <outdir> <WxH> <samples> [t1,t2,...]
import bpy, math, os, random, sys
from mathutils import Vector, Matrix, Quaternion

args = sys.argv[sys.argv.index('--') + 1:]
ORIENT, MODE, OUT = args[0], args[1], args[2]
W, H = (int(x) for x in args[3].split('x'))
SPP = int(args[4])
TIMES = [float(x) for x in args[5].split(',')] if MODE == 'stills' else []
PORTRAIT = ORIENT == 'p'
FPS, DUR = 24, 12
NF = FPS * DUR

# ---------- timing ----------
def ss(a, b, t):
    x = min(1.0, max(0.0, (t - a) / (b - a))); return x * x * (3 - 2 * x)
def activity(t): return ss(0.3, 2.6, t) * (1 - ss(8.6, 11.2, t))
_S = [0.0]
for i in range(1, DUR * 240 + 2): _S.append(_S[-1] + activity(i / 240) / 240)
def S(t):
    x = min(len(_S) - 2, max(0.0, t * 240)); i = int(x); return _S[i] + (_S[i + 1] - _S[i]) * (x - i)
def front(t): return -14 + 14 * (t - 3) / 2.2 if t >= 3 else -30.0
def wave(a0, t):
    d = (min(front(t), 0.0) - a0) / 1.2; return math.exp(-d * d) * (1 - ss(7.4, 10.0, t)) if t >= 3 else 0.0
def adv(t): return 0.5 * ss(8.3, 9.6, t)
def rim(t): return 0.15 + 14 * (ss(4.9, 6.3, t) - 0.96 * ss(7.3, 9.0, t))
HERO_STOP, HERO_T = -0.14, 5.5
def hero_a(t):
    """axial position of the refused slab's leading edge: approaches at speed, hits, recoils, stays"""
    if t < HERO_T: return -5.5 + (HERO_STOP + 5.5) * min(1.0, max(0.0, (t - 4.45) / (HERO_T - 4.45)))
    d = t - HERO_T; return HERO_STOP - 0.07 * math.sin(2 * math.pi * d / 0.6) * math.exp(-3 * d)

# ---------- structure ----------
K, J, JT = 56, 36, 12
R_FIN, R_TILE, R_FRAME, R_RAIL = 2.2, 1.25, 2.85, 3.0
GROUP = 27
rnd = random.Random(7)
RING = []
for k in range(K):
    RING.append(dict(a0=(-14 + 0.25 + 0.5 * k) if k < 28 else (0.75 + 0.5 * (k - 28)),
                     w=rnd.choice((-1, 1)) * rnd.uniform(0.5, 1.6), nu=rnd.uniform(0.6, 1.3), ps=rnd.uniform(0, 6.28),
                     mu=rnd.uniform(0.5, 1.1), pr=rnd.uniform(0, 6.28), lam=rnd.uniform(0.7, 1.5), pt=rnd.uniform(0, 6.28)))

def chaos_pose(k, t, s):
    """ring k's spin, axial shift, radius, base tilt at activity integral s"""
    r = RING[k]
    return (r['w'] * s, 0.3 * (math.sin(r['nu'] * s + r['ps']) - math.sin(r['ps'])), R_FIN + 0.3 * (math.sin(r['mu'] * s + r['pr']) - math.sin(r['pr'])), r['lam'] * s + r['pt'])

def fin_pose(k, j, t):
    """(a, theta, radius, tilt) of glass fin j of ring k at time t, in structure space"""
    ring = RING[k]; th = 2 * math.pi * j / J
    if k >= 28:
        return (ring['a0'] + adv(t), th, R_FIN, 0.0)
    s = min(S(t), S(5.0)) if k == GROUP else S(t)
    phi, sh, rad, tb = chaos_pose(k, t, s)
    p = wave(ring['a0'], t)
    pose = (ring['a0'] + sh + 0.35 * p + adv(t), th + phi, rad, 0.7 * (math.sin(tb + 0.35 * j) - math.sin(ring['pt'] + 0.35 * j)) + 1.5708 * p)
    if k != GROUP: return pose
    aligned = (0.25 + adv(t), th, R_FIN, 0.0)
    if j % 3 == 0:  # these fit: they align and pass
        u = ss(6.2, 7.0, t)
    else:           # these do not: they stop a fraction from the plane, then settle and pass together
        held = (-0.09, pose[1], pose[2], 0.35 * (1 if j % 2 else -1))
        v = ss(5.1, 5.6, t); pose = tuple(pose[i] + (held[i] - pose[i]) * v for i in range(4))
        u = ss(7.4, 8.6, t)
    return tuple(pose[i] + (aligned[i] - pose[i]) * u for i in range(4))

def tile_pose(k, j, t):
    ring = RING[k]; th = 2 * math.pi * (j + 0.5) / JT
    if k >= 28: return (ring['a0'] + adv(t), th, R_TILE, 0.0)
    s = min(S(t), S(5.0)) if k == GROUP else S(t)
    phi, sh, rad, tb = chaos_pose(k, t, s)
    return (ring['a0'] + sh + adv(t), th + 0.5 * phi, R_TILE + 0.08 * (math.sin(tb) - math.sin(ring['pt'])), 0.25 * (math.sin(tb + 0.5 * j) - math.sin(ring['pt'] + 0.5 * j)))

def place(a, th, r, tilt):
    """matrix of an element at axial a, angle th, radius r, tilted about its radial axis (structure space: axis = X)"""
    xr = Vector((0, math.cos(th), math.sin(th))); yt = Vector((0, -math.sin(th), math.cos(th))); za = Vector((1, 0, 0))
    m = Matrix((xr, yt, za)).transposed().to_4x4()
    return Matrix.Translation(Vector((a, r * math.cos(th), r * math.sin(th)))) @ Matrix.Rotation(tilt, 4, xr) @ m

# ---------- scene ----------
scn = bpy.context.scene
for o in list(scn.objects): bpy.data.objects.remove(o)
scn.render.fps = FPS; scn.frame_start, scn.frame_end = 1, NF
scn.render.resolution_x, scn.render.resolution_y = W, H
scn.render.image_settings.file_format = 'PNG'

def principled(name, **kw):
    m = bpy.data.materials.new(name); m.use_nodes = True
    b = m.node_tree.nodes['Principled BSDF']
    for k2, v in kw.items(): b.inputs[k2].default_value = v
    return m
def emissive(name, color, strength):
    m = bpy.data.materials.new(name); m.use_nodes = True
    nt = m.node_tree; nt.nodes.remove(nt.nodes['Principled BSDF'])
    e = nt.nodes.new('ShaderNodeEmission'); e.inputs['Color'].default_value = color; e.inputs['Strength'].default_value = strength
    nt.links.new(e.outputs[0], nt.nodes['Material Output'].inputs['Surface']); return m, e
GLASS = principled('glass', **{'Base Color': (0.92, 0.96, 1, 1), 'Roughness': 0.04, 'Transmission Weight': 1.0, 'IOR': 1.5})
CERAMIC = principled('ceramic', **{'Base Color': (0.8, 0.78, 0.74, 1), 'Roughness': 0.38})
HEROM = principled('hero', **{'Base Color': (0.88, 0.86, 0.82, 1), 'Roughness': 0.3})
METAL = principled('metal', **{'Base Color': (0.06, 0.06, 0.07, 1), 'Metallic': 1.0, 'Roughness': 0.28, 'Anisotropic': 0.7})
FLOOR = principled('floor', **{'Base Color': (0.012, 0.012, 0.015, 1), 'Metallic': 0.4, 'Roughness': 0.1})
PLANE = bpy.data.materials.new('plane'); PLANE.use_nodes = True
pn = PLANE.node_tree; pn.nodes.remove(pn.nodes['Principled BSDF'])
pmix = pn.nodes.new('ShaderNodeMixShader'); pmix.inputs[0].default_value = 0.015
ptr = pn.nodes.new('ShaderNodeBsdfTransparent'); pgl = pn.nodes.new('ShaderNodeBsdfGlossy'); pgl.inputs['Roughness'].default_value = 0.02
pn.links.new(ptr.outputs[0], pmix.inputs[1]); pn.links.new(pgl.outputs[0], pmix.inputs[2]); pn.links.new(pmix.outputs[0], pn.nodes['Material Output'].inputs['Surface'])
RIM, RIM_E = emissive('rim', (1, 0.72, 0.45, 1), 0.15)
STRAND, _ = emissive('strand', (1, 0.82, 0.6, 1), 2.0)
# the glass of the held fins warms when they press the plane: emission driven by object colour
gb = GLASS.node_tree.nodes['Principled BSDF']; oi = GLASS.node_tree.nodes.new('ShaderNodeObjectInfo')
mul = GLASS.node_tree.nodes.new('ShaderNodeMath'); mul.operation = 'MULTIPLY'; mul.inputs[1].default_value = 0.8
GLASS.node_tree.links.new(oi.outputs['Color'], mul.inputs[0]); GLASS.node_tree.links.new(mul.outputs[0], gb.inputs['Emission Strength'])
gb.inputs['Emission Color'].default_value = (1, 0.7, 0.45, 1)
# the current: pulses travelling at one pace, forever
CURRENT, ce = emissive('current', (1, 0.58, 0.25, 1), 1.0)
nt = CURRENT.node_tree
tc = nt.nodes.new('ShaderNodeTexCoord'); sep = nt.nodes.new('ShaderNodeSeparateXYZ'); nt.links.new(tc.outputs['Object'], sep.inputs[0])
T = nt.nodes.new('ShaderNodeValue'); T.name = 'T'
def math_node(op, *vals):
    n = nt.nodes.new('ShaderNodeMath'); n.operation = op
    for i, v in enumerate(vals):
        if isinstance(v, bpy.types.NodeSocket): nt.links.new(v, n.inputs[i])
        else: n.inputs[i].default_value = v
    return n.outputs[0]
phase = math_node('MULTIPLY_ADD', math_node('MULTIPLY', sep.outputs['Z'], 0.33), 6.2832, math_node('MULTIPLY', T.outputs[0], -3.77))
pulse = math_node('POWER', math_node('MULTIPLY_ADD', math_node('SINE', phase), 0.5, 0.5), 10.0)
nt.links.new(math_node('MULTIPLY_ADD', pulse, 16.0, 4.0), ce.inputs['Strength'])

def mesh_box(name, sx, sy, sz):
    bpy.ops.mesh.primitive_cube_add(size=1); o = bpy.context.object; o.name = name
    for v in o.data.vertices: v.co.x *= sx; v.co.y *= sy; v.co.z *= sz
    me = o.data; bpy.data.objects.remove(o); return me
def mesh_cyl(name, r, depth, verts=24):
    bpy.ops.mesh.primitive_cylinder_add(radius=r, depth=depth, vertices=verts); o = bpy.context.object; me = o.data; bpy.data.objects.remove(o); return me
def mesh_torus(name, R, r):
    bpy.ops.mesh.primitive_torus_add(major_radius=R, minor_radius=r, major_segments=96, minor_segments=8); o = bpy.context.object; me = o.data; bpy.data.objects.remove(o); return me

ROOT = bpy.data.objects.new('ROOT', None); scn.collection.objects.link(ROOT)
if PORTRAIT: ROOT.rotation_euler = (0, -math.pi / 2, 0)   # the axis stands up: a tower
def add(name, me, mat, parent=ROOT):
    o = bpy.data.objects.new(name, me); o.data.materials.append(mat) if me and not me.materials else None
    o.parent = parent; scn.collection.objects.link(o); return o

FIN = mesh_box('fin', 0.9, 0.03, 0.38); TILE = mesh_box('tile', 0.05, 0.55, 0.42); RAIL = mesh_box('rail', 28.6, 0.07, 0.07)
FRAME = mesh_torus('frame', R_FRAME, 0.025); STRANDM = mesh_cyl('strand', 0.008, 1.0, 8)

ORDER = bpy.data.objects.new('ORDER', None); ORDER.parent = ROOT; scn.collection.objects.link(ORDER)
fins, tiles, frames = {}, {}, {}
for k in range(K):
    par = ORDER if k >= 28 else ROOT
    for j in range(J):
        o = add('fin%d_%d' % (k, j), FIN, GLASS, par); o.color = (0, 0, 0, 1); fins[k, j] = o
    for j in range(JT): tiles[k, j] = add('tile%d_%d' % (k, j), TILE, CERAMIC, par)
    f = add('frame%d' % k, FRAME, METAL, par); f.rotation_euler = (0, math.pi / 2, 0); frames[k] = f
for i in range(8):
    th = 2 * math.pi * (i + 0.5) / 8
    for side, (a0, a1) in enumerate(((-14.4, -0.4), (0.4, 14.6))):
        r = add('rail%d_%d' % (i, side), RAIL, METAL, ORDER if side else ROOT)
        r.location = ((a0 + a1) / 2, R_RAIL * math.cos(th), R_RAIL * math.sin(th)); r.scale = ((a1 - a0) / 28.6, 1, 1); r.rotation_euler = (th, 0, 0)
cur = add('current', mesh_cyl('cur', 0.07, 34, 32), CURRENT); cur.rotation_euler = (0, math.pi / 2, 0)
chan = add('channel', mesh_cyl('chan', 0.17, 34, 48), GLASS); chan.rotation_euler = (0, math.pi / 2, 0); chan.color = (0, 0, 0, 1)
plane = add('plane', mesh_cyl('pl', 3.5, 0.012, 128), PLANE); plane.rotation_euler = (0, math.pi / 2, 0)
rimo = add('rim', mesh_torus('rimm', 3.5, 0.012), RIM); rimo.rotation_euler = (0, math.pi / 2, 0)
strands = {j: add('strand%d' % j, STRANDM, STRAND) for j in range(J) if j % 3}
hero = add('hero', mesh_box('hero', 0.05, 0.8, 0.55), HEROM)   # the refused change: on the camera side, outside the rails

bpy.ops.mesh.primitive_plane_add(size=160); floor = bpy.context.object; floor.data.materials.append(FLOOR)
floor.location = (0, 0, -16.5 if PORTRAIT else -4.0)
w = scn.world or bpy.data.worlds.new('w'); scn.world = w; w.use_nodes = True
w.node_tree.nodes['Background'].inputs['Color'].default_value = (0.003, 0.003, 0.0045, 1)

def aim(o, target):
    o.rotation_mode = 'QUATERNION'; o.rotation_quaternion = (Vector(target) - o.location).to_track_quat('-Z', 'Y')
def light(name, loc, target, energy, size, color=(0.8, 0.86, 1.0)):
    d = bpy.data.lights.new(name, 'AREA'); d.energy = energy; d.size = size; d.color = color
    o = bpy.data.objects.new(name, d); o.location = loc; aim(o, target); scn.collection.objects.link(o)
if PORTRAIT: light('key', (-12, -16, 10), (0, 0, -3), 1600, 7); light('fill', (14, 12, -2), (0, 0, -4), 400, 10); light('edge', (14, 10, -4), (0, 0, -5), 1, 5)
else: light('key', (-7, -15, 12), (-3, 0, 0), 1300, 7); light('fill', (10, 13, 5), (3, 0, 0), 300, 10); light('edge', (6, 12, 7), (-4, 0, 0), 1, 5)
EDGE = float(os.environ.get('EDGE', 3600))   # the opening's edge light, behind the structure, gone once the camera is inside

# ---------- camera: one continuous shot ----------
if PORTRAIT:
    KEYS = [(0, (-10, -20, -9), (0, 0, -4)), (2.6, (-4, -11, -8), (0, 0, -3)), (4.0, (-0.45, -0.5, -8.5), (0.1, 0, 0)),
            (4.9, (-5.0, -5.0, -7.0), (0, 0, -1)), (5.6, (-0.6, -8.0, -2.8), (-0.2, 0, -0.5), 0.2), (6.6, (-0.7, -8.3, -2.1), (-0.1, 0, -0.3), 0.3),
            (8.5, (-1, -13, 1.5), (0, 0, 0.3)), (10.5, (0, -19, 3), (0, 0, 0.5)), (12, (0, -20, 3.3), (0, 0, 0.5))]
    LENS, FSTOP = 30, 5.6
else:
    KEYS = [(0, (-16, -17, 5.5), (-5, 0, 0.3)), (2.6, (-11, -6, 1.5), (-3, 0, 0)), (4.0, (-8.5, -0.45, 0.5), (0, 0, 0.1)),
            (4.9, (-7.0, -5.0, 0.9), (-1, 0, 0)), (5.6, (-2.8, -8.0, 0.6), (-0.5, 0, -0.45), 0.2), (6.6, (-2.1, -8.3, 0.7), (-0.3, 0, -0.35), 0.3),
            (8.5, (1.5, -13, 3), (0.3, 0, 0)), (10.5, (3, -17, 4.5), (0.5, 0, 0)), (12, (3.3, -18, 4.8), (0.5, 0, 0))]
    LENS, FSTOP = 35, 5.6
def spline(t, idx):
    ts = [k[0] for k in KEYS]; ps = [Vector(k[idx]) for k in KEYS]
    i = max(0, min(len(ts) - 2, next((n for n in range(len(ts) - 1) if t < ts[n + 1]), len(ts) - 2)))
    h = ts[i + 1] - ts[i]; u = (t - ts[i]) / h
    tn = [k[3] if len(k) > 3 else 1.0 for k in KEYS]   # tension: 1 = the Catmull-Rom tangent, 0 = a stop
    m0 = (ps[i + 1] - ps[i - 1]) / (ts[i + 1] - ts[i - 1]) * h * tn[i] if i > 0 else Vector((0, 0, 0))
    m1 = (ps[i + 2] - ps[i]) / (ts[i + 2] - ts[i]) * h * tn[i + 1] if i + 2 < len(ts) else Vector((0, 0, 0))
    return (2 * u**3 - 3 * u**2 + 1) * ps[i] + (u**3 - 2 * u**2 + u) * m0 + (-2 * u**3 + 3 * u**2) * ps[i + 1] + (u**3 - u**2) * m1
camd = bpy.data.cameras.new('cam'); camd.lens = LENS; camd.clip_start = 0.05; camd.dof.use_dof = True; camd.dof.aperture_fstop = FSTOP
cam = bpy.data.objects.new('cam', camd); scn.collection.objects.link(cam); scn.camera = cam; cam.rotation_mode = 'QUATERNION'

# ---------- keyframes ----------
def key(idobj, path, series):
    """series: list of NF tuples; one f-curve per component, one point per frame"""
    ad = idobj.animation_data or idobj.animation_data_create()
    if ad.action is None:
        act = bpy.data.actions.new(idobj.name); ad.action = act
        ad.action_slot = act.slots.new(idobj.id_type, idobj.name); act.layers.new('L').strips.new(type='KEYFRAME')
    cb = ad.action.layers[0].strips[0].channelbag(ad.action_slot, ensure=True)
    for c in range(len(series[0])):
        fc = cb.fcurves.new(path, index=c); fc.keyframe_points.add(NF)
        co = []
        for f in range(NF): co += [f + 1, series[f][c]]
        fc.keyframe_points.foreach_set('co', co); fc.update()
def key_pose(o, mats):
    locs, quats, prev = [], [], None
    for m in mats:
        q = m.to_quaternion()
        if prev is not None and prev.dot(q) < 0: q = -q
        prev = q; locs.append(tuple(m.to_translation())); quats.append(tuple(q))
    o.rotation_mode = 'QUATERNION'; key(o, 'location', locs); key(o, 'rotation_quaternion', quats)

times = [f / FPS for f in range(NF)]
for k in range(28):
    for j in range(J): key_pose(fins[k, j], [place(*fin_pose(k, j, t)) for t in times])
    for j in range(JT): key_pose(tiles[k, j], [place(*tile_pose(k, j, t)) for t in times])
    key_pose(frames[k], [Matrix.Translation((RING[k]['a0'] + chaos_pose(k, t, min(S(t), S(5.0)) if k == GROUP else S(t))[1] + adv(t), 0, 0)) @ Matrix.Rotation(math.pi / 2, 4, 'Y') for t in times])
for k in range(28, K):
    for j in range(J): fins[k, j].matrix_basis = place(*fin_pose(k, j, 0))
    for j in range(JT): tiles[k, j].matrix_basis = place(*tile_pose(k, j, 0))
    frames[k].location = (RING[k]['a0'], 0, 0)
key(ORDER, 'location', [(adv(t), 0, 0) for t in times])
key_pose(hero, [place(hero_a(t) - 0.275, math.pi + 0.22, 3.15, 0.0) for t in times])
key(bpy.data.lights['edge'], 'energy', [(EDGE * (1 - ss(2.0, 3.0, t)),) for t in times])
# held fins: warmth and the strands that stretch from their old sockets
for j in strands:
    key(fins[GROUP, j], 'color', [(e, e, e, 1) for e in ((ss(5.4, 6.5, t) - ss(7.6, 8.8, t)) for t in times)])
    mats = []
    for t in times:
        frozen = place(*fin_pose(GROUP, j, 5.0)).to_translation(); frozen.x += adv(t)
        now = place(*fin_pose(GROUP, j, t)).to_translation(); d = now - frozen; L = d.length
        vis = ss(5.1, 5.3, t) * (1 - ss(8.2, 8.6, t))
        mats.append(Matrix.Translation((frozen + now) / 2) @ d.to_track_quat('Z', 'Y').to_matrix().to_4x4() @ Matrix.Diagonal((1, 1, max(L, 1e-4) * vis, 1)) if L > 1e-5 else Matrix.Diagonal((1, 1, 1e-4, 1)))
    mats2 = mats
    locs = [tuple(m.to_translation()) for m in mats2]; quats = []; prev = None
    for m in mats2:
        q = m.to_quaternion()
        if prev is not None and prev.dot(q) < 0: q = -q
        prev = q; quats.append(tuple(q))
    o = strands[j]; o.rotation_mode = 'QUATERNION'; key(o, 'location', locs); key(o, 'rotation_quaternion', quats); key(o, 'scale', [tuple(m.to_scale()) for m in mats2])
key(RIM.node_tree, 'nodes["Emission"].inputs[1].default_value', [(rim(t),) for t in times])
key(CURRENT.node_tree, 'nodes["T"].outputs[0].default_value', [(t,) for t in times])
cams = []
for t in times:
    p = spline(t, 1); tg = spline(t, 2)
    cams.append(Matrix.Translation(p) @ (tg - p).to_track_quat('-Z', 'Y').to_matrix().to_4x4())
key_pose(cam, cams)
key(camd, 'dof.focus_distance', [((spline(t, 2) - spline(t, 1)).length,) for t in times])

# ---------- render ----------
scn.render.engine = 'CYCLES'
pr = bpy.context.preferences.addons['cycles'].preferences; pr.compute_device_type = 'METAL'; pr.get_devices()
for d in pr.devices: d.use = d.type == 'METAL'
c = scn.cycles; c.device = 'GPU'; c.samples = SPP; c.use_adaptive_sampling = True; c.adaptive_threshold = 0.05
c.use_denoising = True; c.max_bounces = 12; c.diffuse_bounces = 2; c.glossy_bounces = 4; c.transmission_bounces = 12; c.transparent_max_bounces = 8
c.caustics_reflective = False; c.caustics_refractive = False; c.sample_clamp_indirect = 10
c.time_limit = float(os.environ.get('TL', 0))  # seconds per frame; 0 = until the sample count
scn.render.use_motion_blur = True; scn.render.motion_blur_shutter = 0.5; scn.render.use_persistent_data = True
scn.view_settings.view_transform = 'AgX'
comp = bpy.data.node_groups.new('comp', 'CompositorNodeTree'); scn.compositing_node_group = comp; scn.render.use_compositing = True
rl = comp.nodes.new('CompositorNodeRLayers'); gl = comp.nodes.new('CompositorNodeGlare'); comp.interface.new_socket('Image', in_out='OUTPUT', socket_type='NodeSocketColor'); out = comp.nodes.new('NodeGroupOutput')
gl.inputs['Type'].default_value = 'Bloom'; gl.inputs['Threshold'].default_value = 1.0; gl.inputs['Size'].default_value = 0.6; gl.inputs['Strength'].default_value = 0.25
comp.links.new(rl.outputs['Image'], gl.inputs['Image']); comp.links.new(gl.outputs['Image'], out.inputs['Image'])

if MODE == 'stills':
    for n in os.environ.get('HIDE', '').split(','):
        if n: bpy.data.objects[n].hide_render = True
    for t in TIMES:
        scn.frame_set(int(round(t * FPS)) + 1); scn.render.filepath = '%s/t%05.2f.png' % (OUT, t); bpy.ops.render.render(write_still=True)
elif MODE == 'anim':
    scn.render.filepath = OUT + '/f'; bpy.ops.render.render(animation=True)
else:
    scn.render.filepath = OUT + '/f'; bpy.ops.wm.save_as_mainfile(filepath=OUT + '/film-%s.blend' % ORIENT)
