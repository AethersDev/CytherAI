# Two system sequences, AWC-OS's and CytherCAD's, in the film's materials: one memorable moment each, six seconds, no choices.
# blender -b --factory-startup --python-exit-code 1 -P tools/render-systems.py -- <awcos|cad> <stills|anim> <outdir> <WxH> <samples> [t1,t2,...]
# (TL, seconds per frame for Cycles: the published sequences used 10, so their frames depend on the machine.)
# ADII's sequence retired on 2026-10-20 for the passage (tools/render-passage.py); it and its branch of this script are
# backup/adii-sequence-v1/ and `git show 102fdf9:tools/render-systems.py`.
# Behaviour shown is only what each shipped page states (see the premise ledger). The material and key
# helpers repeat film.py's on purpose: tools/render-film.py is the exact source of the accepted film and is not touched.
import bpy, math, os, sys
from mathutils import Vector, Matrix

args = sys.argv[sys.argv.index('--') + 1:]
WHICH, MODE, OUT = args[0], args[1], args[2]
if WHICH not in ('awcos', 'cad') or MODE not in ('stills', 'anim'): raise SystemExit('usage: -- <awcos|cad> <stills|anim> <outdir> <WxH> <samples> [t1,...]')
W, H = (int(x) for x in args[3].split('x'))
SPP = int(args[4])
TIMES = [float(x) for x in args[5].split(',')] if MODE == 'stills' else []
FPS, DUR = 24, 6
NF = FPS * DUR
times = [f / FPS for f in range(NF)]

def ss(a, b, t):
    x = min(1.0, max(0.0, (t - a) / (b - a))); return x * x * (3 - 2 * x)
def lerp(a, b, u): return tuple(a[i] + (b[i] - a[i]) * u for i in range(len(a)))

# ---------- scene, materials (as in film.py) ----------
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
    nt.links.new(e.outputs[0], nt.nodes['Material Output'].inputs['Surface']); return m
GLASS = principled('glass', **{'Base Color': (0.92, 0.96, 1, 1), 'Roughness': 0.04, 'Transmission Weight': 1.0, 'IOR': 1.5})
CERAMIC = principled('ceramic', **{'Base Color': (0.8, 0.78, 0.74, 1), 'Roughness': 0.38})
PALE = principled('pale', **{'Base Color': (0.88, 0.86, 0.82, 1), 'Roughness': 0.3})
METAL = principled('metal', **{'Base Color': (0.06, 0.06, 0.07, 1), 'Metallic': 1.0, 'Roughness': 0.28, 'Anisotropic': 0.7})
FLOOR = principled('floor', **{'Base Color': (0.012, 0.012, 0.015, 1), 'Metallic': 0.4, 'Roughness': 0.1})
RIM = emissive('rim', (1, 0.72, 0.45, 1), 6.0)
WARM = emissive('warm', (1, 0.7, 0.45, 1), 1.0)
# the current: pulses travelling at one pace
CURRENT = emissive('current', (1, 0.58, 0.25, 1), 1.0)
nt = CURRENT.node_tree; ce = nt.nodes['Emission']
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
def add(name, me, mat):
    o = bpy.data.objects.new(name, me); o.data.materials.append(mat); scn.collection.objects.link(o); return o

def key(idobj, path, series):
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
def key_glow(o, series):
    """per-frame emission strength through the object's own copy of a material"""
    m = o.data.materials[0].copy(); o.data = o.data.copy(); o.data.materials[0] = m
    key(m.node_tree, 'nodes["Emission"].inputs[1].default_value', [(s,) for s in series])

# the common ground: current, rails, floor, a ring at x = 0, lights
cur = add('current', mesh_cyl('cur', 0.07, 30, 32), CURRENT); cur.rotation_euler = (0, math.pi / 2, 0)
chan = add('channel', mesh_cyl('chan', 0.17, 30, 48), GLASS); chan.rotation_euler = (0, math.pi / 2, 0)
for i in range(8):
    th = 2 * math.pi * (i + 0.5) / 8
    r = add('rail%d' % i, mesh_box('rail', 30, 0.07, 0.07), METAL); r.location = (0, 3.0 * math.cos(th), 3.0 * math.sin(th)); r.rotation_euler = (th, 0, 0)
for x in range(-7, 8):
    f = add('frame%d' % x, mesh_torus('frame', 2.85, 0.025), METAL); f.rotation_euler = (0, math.pi / 2, 0); f.location = (2 * x, 0, 0)
ring = add('ring', mesh_torus('rim', 3.5, 0.012), RIM); ring.rotation_euler = (0, math.pi / 2, 0)
bpy.ops.mesh.primitive_plane_add(size=160); floor = bpy.context.object; floor.data.materials.append(FLOOR); floor.location = (0, 0, -4.0)
w = scn.world or bpy.data.worlds.new('w'); scn.world = w; w.use_nodes = True
w.node_tree.nodes['Background'].inputs['Color'].default_value = (0.003, 0.003, 0.0045, 1)
def light(name, loc, target, energy, size, color=(0.8, 0.86, 1.0)):
    d = bpy.data.lights.new(name, 'AREA'); d.energy = energy; d.size = size; d.color = color
    o = bpy.data.objects.new(name, d); o.location = loc; o.rotation_mode = 'QUATERNION'
    o.rotation_quaternion = (Vector(target) - Vector(loc)).to_track_quat('-Z', 'Y'); scn.collection.objects.link(o)
light('key', (-7, -15, 12), (0, 0, 0), 1300, 7); light('fill', (10, 13, 5), (0, 0, 0), 300, 10); light('edge', (6, 12, 7), (0, 0, 0), 2400, 5)
key(CURRENT.node_tree, 'nodes["T"].outputs[0].default_value', [(t,) for t in times])

# ---------- 02 AWC-OS: three programs at the engine: executed, refused with an alternative, blocked ----------
if WHICH == 'awcos':
    lanes = (-0.35, -1.25, -2.15)
    def program(name, z, mat=CERAMIC):
        o = add(name, mesh_box(name, 1.1, 0.05, 0.62), mat); o.location = (-6, -2.6, z); return o
    p1 = program('p1', lanes[0]); p2 = program('p2', lanes[1]); p3 = program('p3', lanes[2]); alt = program('alt', lanes[1], PALE)
    def travel(t, t0, t1, x0=-6.0, x1=-0.25): return x0 + (x1 - x0) * ss(t0, t1, t)
    # 1: arrives, passes, continues: executed
    key(p1, 'location', [(travel(t, 0.3, 1.5) + 1.9 * ss(1.6, 2.6, t), -2.6, lanes[0]) for t in times])
    # 2: arrives, is turned back: refused, and set aside (up out of its lane and back from it) so the compliant
    #    alternative passes in the lane it left; until 2026-10-19 it stayed in the lane and the alternative passed through it
    key(p2, 'location', [(travel(t, 1.4, 2.6) - 1.4 * ss(2.8, 3.4, t), -2.6 + 0.5 * ss(2.9, 3.4, t), lanes[1] + 0.65 * ss(2.9, 3.4, t)) for t in times])
    key(alt, 'location', [(travel(t, 3.4, 4.3, -6.0, -0.25) + 1.7 * ss(4.35, 5.2, t), -2.6, lanes[1]) for t in times])
    # 3: fails before the engine: blocked, nothing passes
    key(p3, 'location', [(travel(t, 3.0, 4.6, -6.0, -1.1), -2.6, lanes[2]) for t in times])
    for p in (p1, p2, p3): p.data = p.data.copy()
    g1 = add('g1', mesh_box('g', 0.9, 0.012, 0.07), WARM)   # each program carries its light on its face
    g2 = add('g2', g1.data, WARM); g3 = add('g3', g1.data, WARM)
    for g, p in ((g1, p1), (g2, p2), (g3, p3)):
        g.parent = p; g.location = (0, -0.03, 0.18)
    key_glow(g1, [3.0 for t in times]); key_glow(g2, [3.0 * (1 - 0.7 * ss(2.7, 3.0, t)) for t in times]); key_glow(g3, [3.0 * (1 - ss(4.3, 4.7, t)) for t in times])
    stop = add('stop', mesh_torus('stop', 0.75, 0.012), RIM); stop.rotation_euler = (0, math.pi / 2, 0)
    key(stop, 'location', [(-0.3, -2.6, lanes[1]) for t in times]); key(stop, 'scale', [(s, s, s) for s in (ss(2.55, 2.75, t) * (1 - ss(3.4, 3.7, t)) for t in times)])
    CAM = [((-2.8, -8.2, 0.3), (0.0, 0, -1.2)), ((-1.8, -7.2, 0.1), (0.3, 0, -1.25))]

# ---------- 03 CytherCAD: tokens in; only the valid pass; a part is built and measured ----------
else:
    toks = []
    for i in range(14):
        o = add('tok%d' % i, mesh_box('tok', 0.42, 0.05, 0.42), CERAMIC); toks.append(o)
    # the refused, each on its own row (0.56 apart; until 2026-10-19 two shared one and merged): each stops a fraction
    # short of the ring and stays, stepped back out of the stream so the tokens that follow pass in front of it, never
    # through it
    bad = {3: -1.46, 8: -0.34, 12: -0.90}
    for i, o in enumerate(toks):
        t0 = 0.2 + 0.22 * i; z = bad.get(i, -0.9 + 0.55 * math.sin(1.7 * i)); y = -2.6
        if i in bad:
            key(o, 'location', [(-6 + 5.8 * ss(t0, t0 + 1.2, t), y + 0.45 * ss(t0 + 1.1, t0 + 1.3, t), z) for t in times])
        else:          # aligns and passes, into the part, leaving the ring as it reaches it (a token that lingered there
                       # was caught by the next, 0.22 s behind it)
            key(o, 'location', [(-6 + 5.8 * ss(t0, t0 + 1.2, t) + 2.3 * ss(t0 + 1.2, t0 + 1.55, t), y, z + (-1.0 - z) * ss(t0 + 1.2, t0 + 1.55, t)) for t in times])
            key(o, 'scale', [(1 - ss(t0 + 1.45, t0 + 1.6, t),) * 3 for t in times])
    # the part: a stepped block with a bore, built in three operations past the ring
    base = add('base', mesh_box('base', 2.2, 1.3, 0.6), PALE); base.location = (2.3, -2.0, -1.5)
    step = add('step', mesh_box('step', 1.1, 1.3, 0.6), PALE); step.location = (1.75, -2.0, -0.9)
    bore = add('bore', mesh_cyl('bore', 0.3, 1.4, 48), METAL); bore.rotation_euler = (math.pi / 2, 0, 0); bore.location = (2.85, -2.0, -1.5)
    key(base, 'scale', [(1, 1, max(1e-3, ss(1.9, 2.8, t))) for t in times]); key(base, 'location', [(2.3, -2.0, -1.8 + 0.3 * ss(1.9, 2.8, t)) for t in times])
    key(step, 'scale', [(1, 1, max(1e-3, ss(2.9, 3.7, t))) for t in times]); key(step, 'location', [(1.75, -2.0, -1.2 + 0.3 * ss(2.9, 3.7, t)) for t in times])
    key(bore, 'location', [(2.85, -2.0 - 1.6 * (1 - ss(3.8, 4.5, t)), -1.5) for t in times])
    gauge = add('gauge', mesh_torus('gauge', 1.25, 0.012), RIM); gauge.rotation_euler = (0, math.pi / 2, 0)   # the kernel's measurement sweeps the part
    key(gauge, 'location', [(1.1 + 2.4 * ss(4.7, 5.5, t), -2.0, -1.2) for t in times]); key(gauge, 'scale', [(s, s, s) for s in (ss(4.6, 4.8, t) * (1 - ss(5.5, 5.7, t)) for t in times)])
    CAM = [((-2.6, -8.4, 0.4), (-0.6, 0, -1.1)), ((-0.4, -7.0, 0.0), (1.0, 0, -1.2))]

# ---------- camera: one slow push ----------
camd = bpy.data.cameras.new('cam'); camd.lens = 35; camd.clip_start = 0.05; camd.dof.use_dof = True; camd.dof.aperture_fstop = 5.6
cam = bpy.data.objects.new('cam', camd); scn.collection.objects.link(cam); scn.camera = cam; cam.rotation_mode = 'QUATERNION'
locs, quats = [], []
for t in times:
    u = ss(0, DUR, t); p = Vector(lerp(CAM[0][0], CAM[1][0], u)); tg = Vector(lerp(CAM[0][1], CAM[1][1], u))
    locs.append(tuple(p)); quats.append(tuple((tg - p).to_track_quat('-Z', 'Y')))
key(cam, 'location', locs); key(cam, 'rotation_quaternion', quats)
key(camd, 'dof.focus_distance', [((Vector(lerp(CAM[0][1], CAM[1][1], ss(0, DUR, t))) - Vector(lerp(CAM[0][0], CAM[1][0], ss(0, DUR, t)))).length,) for t in times])

# ---------- render (as film.py) ----------
scn.render.engine = 'CYCLES'
pr = bpy.context.preferences.addons['cycles'].preferences; pr.compute_device_type = 'METAL'; pr.get_devices()
for d in pr.devices: d.use = d.type == 'METAL'
c = scn.cycles; c.device = 'GPU'; c.samples = SPP; c.use_adaptive_sampling = True; c.adaptive_threshold = 0.05
c.use_denoising = True; c.max_bounces = 12; c.diffuse_bounces = 2; c.glossy_bounces = 4; c.transmission_bounces = 12; c.transparent_max_bounces = 8
c.caustics_reflective = False; c.caustics_refractive = False; c.sample_clamp_indirect = 10
c.time_limit = float(os.environ.get('TL', 0))
scn.render.use_motion_blur = True; scn.render.motion_blur_shutter = 0.5; scn.render.use_persistent_data = True
scn.view_settings.view_transform = 'AgX'
comp = bpy.data.node_groups.new('comp', 'CompositorNodeTree'); scn.compositing_node_group = comp; scn.render.use_compositing = True
rl = comp.nodes.new('CompositorNodeRLayers'); gl = comp.nodes.new('CompositorNodeGlare'); comp.interface.new_socket('Image', in_out='OUTPUT', socket_type='NodeSocketColor'); out = comp.nodes.new('NodeGroupOutput')
gl.inputs['Type'].default_value = 'Bloom'; gl.inputs['Threshold'].default_value = 1.0; gl.inputs['Size'].default_value = 0.6; gl.inputs['Strength'].default_value = 0.25
comp.links.new(rl.outputs['Image'], gl.inputs['Image']); comp.links.new(gl.outputs['Image'], out.inputs['Image'])

if MODE == 'stills':
    for t in TIMES:
        scn.frame_set(int(round(t * FPS)) + 1); scn.render.filepath = '%s/t%05.2f.png' % (OUT, t); bpy.ops.render.render(write_still=True)
else:
    scn.render.filepath = OUT + '/f'; bpy.ops.render.render(animation=True)
