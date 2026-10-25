# Both looked flat: two blocks of lapped steel, the same to the eye, each tested with an optical flat under sodium light.
# Built and rendered offline in Blender 5.1 (Cycles, Metal); every fringe is computed, none is drawn:
#   the reflectance of the stack glass | silver film | air gap | steel (characteristic matrices, every internal reflection,
#   normal incidence) for the sodium D lines (D2 twice D1), at the gap the scene's own timeline sets, its phase taken at the
#   camera ray's own angle, and averaged over a half-frame shutter; the camera's aperture washes the fringes out at large
#   gaps by itself. The flats' working faces are partially silvered (15 nm), as gauge interferometers' flats were, which
#   makes the fringes sharp. Block A is flat; block B rises 1.2 micrometres toward its middle, which nothing but the
#   light shows. Square frames, so one render gives the landscape and the portrait crop.
# blender -b --factory-startup --python-exit-code 1 -P tools/render-flat.py -- <l|p> <out> <spp> <fps> [first-last|t,t,...]
#   l: 1440x810, the blocks side by side; p: 810x1440, seen from the side, one beyond the other. Frames: a range of frame
#   numbers (an existing frame is kept, so a stopped run resumes), or seconds for stills.
# blender ... -P tools/render-flat.py -- plates <out> <spp>
#   the instrument's plates (js/flat.js): both flats resting, seen from above without depth of field, once for each constant
#   reflectance under the glass (0, 0.25, 0.5, 0.75, 1), and plate.json, the camera and the scene's planes: the page traces
#   each pixel's ray through the glass to the steel, computes the stack's reflectance there, and blends the plates at it.
import bpy, cmath, math, os, sys
from mathutils import Vector

args = sys.argv[sys.argv.index('--') + 1:]
ORIENT, OUT, SPP = args[0], args[1], int(args[2])
FPS = int(args[3]) if ORIENT != 'plates' else 12
PLATES = ORIENT == 'plates'
if ORIENT not in ('l', 'p', 'plates'): raise SystemExit('orientation: l, p or plates')
DUR = 32.0
WHICH = args[4] if len(args) > 4 else '1-%d' % int(DUR * FPS)
PLATE_R = (0.0, 0.25, 0.5, 0.75, 1.0)

# ---------- the physics ----------
N_GLASS = 1.4585                     # fused silica at 589.3 nm (Malitson 1965)
N_STEEL = complex(2.93, -3.00)       # iron at 589 nm (Johnson and Christy 1974, interpolated); N = n - ik, as the matrices take it
N_SILVER = complex(0.052, -3.92)     # silver at 589 nm (Johnson and Christy 1972, interpolated)
COAT = 15e-9                         # the flats' silver film
LINES = ((589.0e-9, 2 / 3), (589.6e-9, 1 / 3))   # sodium D2 and D1
def stack(u, lam=589.3e-9):
    """reflectance of glass | silver | air gap | steel, seen from the glass, at gap phase u = 2 d / lambda (mod 1)"""
    M = [[1, 0], [0, 1]]
    for n, t in ((N_SILVER, COAT), (1.0, u * lam / 2)):
        dl = 2 * math.pi * n * t / lam; c, s = cmath.cos(dl), cmath.sin(dl)
        A = [[c, 1j * s / n], [1j * n * s, c]]
        M = [[M[0][0] * A[0][0] + M[0][1] * A[1][0], M[0][0] * A[0][1] + M[0][1] * A[1][1]],
             [M[1][0] * A[0][0] + M[1][1] * A[1][0], M[1][0] * A[0][1] + M[1][1] * A[1][1]]]
    B, C = M[0][0] + M[0][1] * N_STEEL, M[1][0] + M[1][1] * N_STEEL
    return abs((N_GLASS * B - C) / (N_GLASS * B + C)) ** 2
BARE = abs((1 - N_STEEL) / (1 + N_STEEL)) ** 2   # the steel in air, where no glass lies
FILM_R, FILM_T = 0.575, 0.395                     # the silver film alone (same matrices): a semi-mirror while the flat is
NEAR = 0.2e-3                                     # off the steel; within NEAR of it the stack, film included, takes over

# ---------- the timeline (seconds) ----------
def ss(a, b, t):
    x = min(1.0, max(0.0, (t - a) / (b - a))); return x * x * (3 - 2 * x)
def ease_out(a, b, t):
    x = min(1.0, max(0.0, (t - a) / (b - a))); return 1 - (1 - x) ** 3
FLAT_R, FLAT_H, LIFT, REST = 0.03, 0.008, 0.30, 30e-6   # LIFT: out of every view
SETTLE = {'A': (3.0, 8.0, 12.5), 'B': (14.5, 19.0, 23.5)}   # descent starts, the air film reached, settled
TILT = {'A': (2.0e-4, 4.0e-5), 'B': (1.2e-4, 0.6e-5)}       # radians, as it reaches the air film, settled: A's wedge, a fringe every 7.4 mm
BUMP = {'A': 0.0, 'B': 1.2e-6}                             # the face's rise toward its middle
def height(k, t):
    """the flat's underside above its block, metres: the descent, then the air film squeezed out, slowing to 0.05 um"""
    a, b, c = SETTLE[k]
    if t < b: return REST + (LIFT - REST) * (1 - ease_out(a, b, t))
    return 0.05e-6 + (REST - 0.05e-6) * math.exp(-(t - b) / 0.95)
def tilt(k, t):
    a, b, c = SETTLE[k]; hi, lo = TILT[k]
    return hi + (lo - hi) * ss(b, c, t)

# ---------- scene ----------
scn = bpy.context.scene
for o in list(scn.objects): bpy.data.objects.remove(o)
scn.render.resolution_x, scn.render.resolution_y = (810, 1440) if ORIENT == 'p' else (1440, 810)
scn.render.fps = FPS

def mat(name): m = bpy.data.materials.new(name); m.use_nodes = True; return m, m.node_tree
def link(nt, a, b): nt.links.new(a, b)
def node(nt, kind, **inputs):
    n = nt.nodes.new(kind)
    for k, v in inputs.items(): n.inputs[k].default_value = v
    return n
def mnode(nt, op, a, b=None):
    n = nt.nodes.new('ShaderNodeMath'); n.operation = op
    for i, v in enumerate((a, b)):
        if v is None: continue
        if isinstance(v, bpy.types.NodeSocket): link(nt, v, n.inputs[i])
        else: n.inputs[i].default_value = v
    return n.outputs[0]

LUT = bpy.data.images.new('stack', 2048, 1, float_buffer=True, is_data=True)
px = []
for i in range(2048):
    r = stack((i + 0.5) / 2048); px += [r, r, r, 1.0]
LUT.pixels.foreach_set(px)

# black granite, honed: a fine grain of paler crystals
granite, nt = mat('granite')
b = nt.nodes['Principled BSDF']; b.inputs['Roughness'].default_value = 0.55; b.inputs['Specular IOR Level'].default_value = 0.12
noi = node(nt, 'ShaderNodeTexNoise', Scale=18.0, Detail=4.0)
mix = node(nt, 'ShaderNodeMix'); mix.data_type = 'RGBA'
link(nt, noi.outputs['Fac'], mix.inputs['Factor'])
mix.inputs['A'].default_value = (0.006, 0.006, 0.0065, 1); mix.inputs['B'].default_value = (0.014, 0.0135, 0.013, 1)
link(nt, mix.outputs['Result'], b.inputs['Base Color'])
bpy.ops.mesh.primitive_cube_add(size=1, location=(0, 0, -0.04)); plate = bpy.context.object; plate.scale = (0.9, 0.6, 0.08)
plate.data.materials.append(granite)

steel_side, nt = mat('steel_side')
b = nt.nodes['Principled BSDF']; b.inputs['Metallic'].default_value = 1.0; b.inputs['Roughness'].default_value = 0.3
b.inputs['Base Color'].default_value = (0.56, 0.57, 0.58, 1); b.inputs['Anisotropic'].default_value = 0.8   # ground, not lapped

def lapped(name):
    """the lapped face: bare steel in air, and under its flat the stack's reflectance at the gap, shutter-averaged"""
    m, nt = mat(name)
    b = nt.nodes['Principled BSDF']; b.inputs['Metallic'].default_value = 1.0; b.inputs['Roughness'].default_value = 0.035
    sep = nt.nodes.new('ShaderNodeSeparateXYZ'); link(nt, nt.nodes.new('ShaderNodeTexCoord').outputs['Object'], sep.inputs[0])
    geo = nt.nodes.new('ShaderNodeNewGeometry')
    dot = nt.nodes.new('ShaderNodeVectorMath'); dot.operation = 'DOT_PRODUCT'
    link(nt, geo.outputs['Incoming'], dot.inputs[0]); link(nt, geo.outputs['Normal'], dot.inputs[1])
    cos_t = mnode(nt, 'ABSOLUTE', dot.outputs['Value'])
    val = {}
    for name_ in ('G0', 'DG', 'TILT', 'AZ', 'BUMP', 'NEAR', 'FIXED', 'R'):
        v = nt.nodes.new('ShaderNodeValue'); v.name = v.label = name_; val[name_] = v.outputs[0]
    x, y = sep.outputs['X'], sep.outputs['Y']
    r2 = mnode(nt, 'ADD', mnode(nt, 'MULTIPLY', x, x), mnode(nt, 'MULTIPLY', y, y))
    rise = mnode(nt, 'MULTIPLY', val['BUMP'], mnode(nt, 'SUBTRACT', 1.0, mnode(nt, 'EXPONENT', mnode(nt, 'DIVIDE', r2, -2 * 0.014 ** 2))))
    along = mnode(nt, 'ADD', mnode(nt, 'MULTIPLY', x, mnode(nt, 'COSINE', val['AZ'])), mnode(nt, 'MULTIPLY', y, mnode(nt, 'SINE', val['AZ'])))
    d = mnode(nt, 'ADD', mnode(nt, 'ADD', val['G0'], mnode(nt, 'MULTIPLY', val['TILT'], mnode(nt, 'ADD', along, FLAT_R))), rise)
    total = None
    for k in range(8):                       # the shutter: half a frame, eight instants
        dk = mnode(nt, 'ADD', d, mnode(nt, 'MULTIPLY', val['DG'], k / 7 - 0.5))
        for lam, weight in LINES:
            u = mnode(nt, 'FRACT', mnode(nt, 'DIVIDE', mnode(nt, 'MULTIPLY', mnode(nt, 'MULTIPLY', dk, cos_t), 2.0), lam))
            comb = nt.nodes.new('ShaderNodeCombineXYZ'); link(nt, u, comb.inputs['X']); comb.inputs['Y'].default_value = 0.5
            tex = nt.nodes.new('ShaderNodeTexImage'); tex.image = LUT; tex.interpolation = 'Linear'; tex.extension = 'EXTEND'
            link(nt, comb.outputs[0], tex.inputs['Vector'])
            term = mnode(nt, 'MULTIPLY', tex.outputs['Color'], weight / 8)
            total = term if total is None else mnode(nt, 'ADD', total, term)
    inside = mnode(nt, 'MULTIPLY', mnode(nt, 'LESS_THAN', mnode(nt, 'SQRT', r2), FLAT_R), val['NEAR'])   # only under the glass, laid on it
    fixed = nt.nodes.new('ShaderNodeMix'); fixed.data_type = 'FLOAT'   # the plates: a constant reflectance under the glass
    link(nt, val['FIXED'], fixed.inputs['Factor']); link(nt, total, fixed.inputs['A']); link(nt, val['R'], fixed.inputs['B'])
    pick = nt.nodes.new('ShaderNodeMix'); pick.data_type = 'FLOAT'; pick.inputs['A'].default_value = BARE
    link(nt, inside, pick.inputs['Factor']); link(nt, fixed.outputs['Result'], pick.inputs['B']); link(nt, pick.outputs['Result'], b.inputs['Base Color'])
    return m

silica, nt = mat('silica'); nt.nodes.remove(nt.nodes['Principled BSDF'])   # the top face, anti-reflection coated
ar = nt.nodes.new('ShaderNodeAddShader')
g = node(nt, 'ShaderNodeBsdfGlossy', Roughness=0.0); g.inputs['Color'].default_value = (0.005,) * 3 + (1,)
t_ = node(nt, 'ShaderNodeBsdfRefraction', IOR=N_GLASS, Roughness=0.0); t_.inputs['Color'].default_value = (0.995,) * 3 + (1,)
link(nt, g.outputs[0], ar.inputs[0]); link(nt, t_.outputs[0], ar.inputs[1]); link(nt, ar.outputs[0], nt.nodes['Material Output'].inputs[0])
rim, nt = mat('rim'); nt.nodes.remove(nt.nodes['Principled BSDF'])       # the flat's ground cylinder
link(nt, node(nt, 'ShaderNodeBsdfGlass', IOR=N_GLASS, Roughness=0.45).outputs[0], nt.nodes['Material Output'].inputs[0])

BLOCKS = {'A': -0.045, 'B': 0.045}
faces, flats = {}, {}
for k, bx in BLOCKS.items():
    bpy.ops.mesh.primitive_cube_add(size=1, location=(bx, 0, 0.01)); blk = bpy.context.object; blk.name = 'block' + k
    blk.scale = (0.064, 0.064, 0.02); bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)   # keep its origin: the shader reads the face from it
    bev = blk.modifiers.new('chamfer', 'BEVEL'); bev.width = 0.0006; bev.segments = 3; bev.limit_method = 'ANGLE'
    faces[k] = lapped('lapped' + k)
    blk.data.materials.append(steel_side); blk.data.materials.append(faces[k])
    for p in blk.data.polygons: p.material_index = 1 if p.normal.z > 0.99 else 0
    bpy.ops.mesh.primitive_cylinder_add(vertices=256, radius=FLAT_R, depth=FLAT_H, location=(bx, 0, 0.02 + FLAT_H / 2 + LIFT))
    fl = bpy.context.object; fl.name = 'flat' + k
    bev = fl.modifiers.new('chamfer', 'BEVEL'); bev.width = 0.0008; bev.segments = 2; bev.limit_method = 'ANGLE'
    # the silvered underside: a semi-mirror off the steel; laid on it, counted in the stack, so it must not reflect twice
    under, nt = mat('under' + k); nt.nodes.remove(nt.nodes['Principled BSDF'])
    off = nt.nodes.new('ShaderNodeAddShader')
    gl = node(nt, 'ShaderNodeBsdfGlossy', Roughness=0.0); gl.inputs['Color'].default_value = (FILM_R,) * 3 + (1,)
    rf = node(nt, 'ShaderNodeBsdfRefraction', IOR=N_GLASS, Roughness=0.0); rf.inputs['Color'].default_value = (FILM_T,) * 3 + (1,)
    link(nt, gl.outputs[0], off.inputs[0]); link(nt, rf.outputs[0], off.inputs[1])
    on = node(nt, 'ShaderNodeBsdfRefraction', IOR=N_GLASS, Roughness=0.0)
    sw = nt.nodes.new('ShaderNodeMixShader'); sw.name = 'NEAR'
    link(nt, off.outputs[0], sw.inputs[1]); link(nt, on.outputs[0], sw.inputs[2]); link(nt, sw.outputs[0], nt.nodes['Material Output'].inputs[0])
    for m in (silica, under, rim): fl.data.materials.append(m)
    for p in fl.data.polygons: p.material_index = 0 if p.normal.z > 0.99 else 1 if p.normal.z < -0.99 else 2
    bpy.ops.object.shade_auto_smooth(angle=math.radians(40))
    flats[k] = fl

# sodium light: one wide box behind, where the camera's reflections fall, and a dim card in front for the steel's sides
SODIUM = (1.0, 0.5, 0.12)
def area(name, size, size_y, energy, loc, aim):
    l = bpy.data.lights.new(name, 'AREA'); l.shape = 'RECTANGLE'; l.size, l.size_y = size, size_y; l.color = SODIUM; l.energy = energy
    o = bpy.data.objects.new(name, l); scn.collection.objects.link(o); o.location = loc
    o.rotation_euler = (Vector(aim) - o.location).to_track_quat('-Z', 'Y').to_euler(); return o, l
LOOK = Vector((1, 0, 0)) if ORIENT == 'p' else Vector((0, 1, 0))   # the camera's horizontal heading
EL0 = math.radians(40)
_, box = area('sodium', 0.95, 0.45, 1.25, tuple(Vector((0, 0, 0.026)) + 0.45 * (math.cos(EL0) * LOOK + math.sin(EL0) * Vector((0, 0, 1)))),
              (0, 0, 0.026)); box.spread = math.radians(60)   # behind, where the steel mirrors the camera; aimed, so little spills
if ORIENT == 'p': bpy.data.objects['sodium'].rotation_euler.rotate_axis('Z', math.radians(90))
area('card', 0.8, 0.2, 0.22, tuple(Vector((0, 0, 0.06)) - 0.5 * LOOK), (0, 0, 0.026))
w = bpy.data.worlds.new('dark'); scn.world = w; w.use_nodes = True
w.node_tree.nodes['Background'].inputs['Color'].default_value = (0, 0, 0, 1)

# the camera: both blocks, in to A, across to B, back out to both
WIDE, AT_A, AT_B = (0.0, 0.52 if ORIENT == 'l' else 0.50, 36), (-0.045, 0.26, 42), (0.045, 0.26, 42)   # look-at x, distance, elevation
OPEN = WIDE if ORIENT == 'l' else (-0.03, 0.56, 36)   # the portrait opens further back: its words take the frame's lower third
KEYS = [(0.0, OPEN), (3.0, OPEN), (8.5, AT_A), (13.5, AT_A), (18.5, AT_B), (24.5, AT_B), (29.5, WIDE), (DUR, WIDE)]
def cam_at(t):
    for (t0, a), (t1, b) in zip(KEYS, KEYS[1:]):
        if t <= t1:
            u = ss(t0, t1, t); return tuple(a[i] + (b[i] - a[i]) * u for i in range(3))
    return KEYS[-1][1]
camd = bpy.data.cameras.new('cam'); camd.lens = 90; camd.sensor_width = 36; camd.dof.use_dof = True; camd.dof.aperture_fstop = 9.0
camd.shift_y = -0.09   # the subject above the band the words take
cam = bpy.data.objects.new('cam', camd); scn.collection.objects.link(cam); scn.camera = cam

scn.render.engine = 'CYCLES'
pr = bpy.context.preferences.addons['cycles'].preferences; pr.compute_device_type = 'METAL'; pr.get_devices()
for dv in pr.devices: dv.use = dv.type == 'METAL'
c = scn.cycles; c.device = 'GPU'; c.samples = SPP; c.use_denoising = True
c.max_bounces = 16; c.glossy_bounces = 8; c.transmission_bounces = 12; c.caustics_reflective = False; c.caustics_refractive = False
scn.render.use_persistent_data = True
scn.view_settings.view_transform = 'AgX'; scn.view_settings.look = 'AgX - Medium High Contrast'

def pose(t):
    lx, dist, el = cam_at(t); e = math.radians(el)
    target = Vector((lx, 0.0, 0.026))
    cam.location = target - dist * math.cos(e) * LOOK + Vector((0.0, 0.0, dist * math.sin(e)))
    cam.rotation_euler = (target - cam.location).to_track_quat('-Z', 'Y').to_euler()
    camd.dof.focus_distance = dist
    for k, fl in flats.items():
        h = height(k, t)
        fl.location.z = 0.02 + FLAT_H / 2 + max(h, 0.00005)                # never closer than the drawing's 50 um
        near = 1.0 if h < NEAR else 0.0
        bpy.data.materials['under' + k].node_tree.nodes['NEAR'].inputs[0].default_value = near
        nodes_ = faces[k].node_tree.nodes; nodes_['NEAR'].outputs[0].default_value = near
        dt = 0.25 / FPS                                                    # half a frame
        for name_, v in (('G0', h), ('DG', height(k, t + dt) - height(k, t - dt)), ('TILT', tilt(k, t)),
                         ('AZ', math.radians(28 if k == 'A' else 60)), ('BUMP', BUMP[k])):
            nodes_[name_].outputs[0].default_value = v

os.makedirs(OUT, exist_ok=True)
if PLATES:   # both flats at rest, from above, everything sharp: the instrument computes its own fringes
    import json
    pose(DUR)
    target, e = Vector((0.0, 0.0, 0.026)), math.radians(62)
    cam.location = target - 0.37 * math.cos(e) * LOOK + Vector((0.0, 0.0, 0.37 * math.sin(e)))
    cam.rotation_euler = (target - cam.location).to_track_quat('-Z', 'Y').to_euler()
    camd.dof.use_dof = False; camd.shift_y = 0.0; camd.lens = 70
    lamp = bpy.data.objects['sodium']   # the lamp at this camera's mirror image, so every point under the glass mirrors it
    lamp.location = target + 0.45 * (math.cos(e) * LOOK + Vector((0.0, 0.0, math.sin(e))))
    lamp.rotation_euler = (target - lamp.location).to_track_quat('-Z', 'Y').to_euler()
    for k in BLOCKS:
        nodes_ = faces[k].node_tree.nodes; nodes_['FIXED'].outputs[0].default_value = 1.0
        bpy.data.materials['under' + k].node_tree.nodes['NEAR'].inputs[0].default_value = 1.0
        nodes_['NEAR'].outputs[0].default_value = 1.0
    for r in PLATE_R:
        for k in BLOCKS: faces[k].node_tree.nodes['R'].outputs[0].default_value = r
        scn.render.filepath = os.path.join(OUT, 'plate-%03d.png' % round(r * 100))
        bpy.ops.render.render(write_still=True); print('PLATE', r, flush=True)
    bpy.context.view_layer.update()
    m = cam.matrix_world
    z_under = 0.02 + 0.00005
    json.dump({'width': 1440, 'height': 810, 'lens': camd.lens, 'sensor': camd.sensor_width, 'shift': [camd.shift_x, camd.shift_y],
               'location': list(m.translation), 'rotation': [list(m.col[i][:3]) for i in range(3)],   # camera axes in the world
               'blocks': {k: [x, 0.0] for k, x in BLOCKS.items()}, 'half': 0.032, 'flat_r': FLAT_R - 0.0008,
               'under': z_under, 'top': z_under + FLAT_H, 'n_glass': N_GLASS,
               'rest': {k: {'gap': height(k, DUR), 'tilt': tilt(k, DUR), 'az': 28 if k == 'A' else 60, 'bump': BUMP[k]} for k in BLOCKS},
               'plates': [round(r * 100) for r in PLATE_R]}, open(os.path.join(OUT, 'plate.json'), 'w'), indent=1)
    raise SystemExit(0)
if '-' in WHICH and ',' not in WHICH and not WHICH.startswith('-'):
    first, last = (int(x) for x in WHICH.split('-'))
    jobs = [((f - 1) / FPS, os.path.join(OUT, 'f%04d.png' % f)) for f in range(first, last + 1)]
else:
    jobs = [(float(x), os.path.join(OUT, 't%05.2f.png' % float(x))) for x in WHICH.split(',')]
for t, path in jobs:
    if os.path.exists(path): continue
    pose(t); scn.render.filepath = path
    bpy.ops.render.render(write_still=True)
    print('FRAME', round(t, 3), flush=True)
