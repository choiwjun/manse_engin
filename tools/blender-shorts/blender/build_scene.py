#!/usr/bin/env python3
import argparse, json, math, os, random, sys
from pathlib import Path
import bpy
from mathutils import Vector

def cli():
    argv = sys.argv[sys.argv.index("--")+1:] if "--" in sys.argv else []
    p = argparse.ArgumentParser()
    p.add_argument("--input", required=True)
    p.add_argument("--output-blend", default="saju-short.blend")
    p.add_argument("--output-video", default="saju-short.mp4")
    p.add_argument("--engine", choices=["cycles","eevee"], default="cycles")
    p.add_argument("--font", default=None)
    p.add_argument("--audio", default=None)
    p.add_argument("--render", action="store_true")
    return p.parse_args(argv)

def rgba(h):
    h=h.lstrip("#")
    return tuple(int(h[i:i+2],16)/255 for i in (0,2,4))+(1,)

def mat(name, color, metallic=0, rough=.4, emit=0):
    m=bpy.data.materials.new(name); m.use_nodes=True
    b=m.node_tree.nodes.get("Principled BSDF")
    c=rgba(color); b.inputs["Base Color"].default_value=c
    b.inputs["Metallic"].default_value=metallic
    b.inputs["Roughness"].default_value=rough
    if emit:
        if "Emission Color" in b.inputs:
            b.inputs["Emission Color"].default_value=c
            b.inputs["Emission Strength"].default_value=emit
        elif "Emission" in b.inputs:
            b.inputs["Emission"].default_value=c
            if "Emission Strength" in b.inputs: b.inputs["Emission Strength"].default_value=emit
    return m

def font_load(explicit=None):
    for f in [explicit, os.getenv("SAJU_FONT"), r"C:\Windows\Fonts\malgun.ttf",
              r"C:\Windows\Fonts\malgunbd.ttf",
              "/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc",
              "/System/Library/Fonts/AppleSDGothicNeo.ttc"]:
        if f and os.path.exists(f):
            try: return bpy.data.fonts.load(f)
            except: pass
    return None

def look(obj, target):
    obj.rotation_euler=(Vector(target)-obj.location).to_track_quat("-Z","Y").to_euler()

def text(name, body, loc, size, material, font=None, extrude=.012, bevel=.004):
    c=bpy.data.curves.new(name+"Curve","FONT")
    c.body=body; c.align_x="CENTER"; c.align_y="CENTER"; c.size=size
    c.extrude=extrude; c.bevel_depth=bevel
    if font: c.font=font
    o=bpy.data.objects.new(name,c); o.location=loc; c.materials.append(material)
    bpy.context.collection.objects.link(o); return o

def visible(o, a, b, pop=True):
    o.hide_render=True; o.keyframe_insert("hide_render", frame=max(1,a-1))
    o.hide_render=False; o.keyframe_insert("hide_render", frame=a)
    o.hide_render=False; o.keyframe_insert("hide_render", frame=b)
    o.hide_render=True; o.keyframe_insert("hide_render", frame=b+1)
    if pop:
        s=o.scale.copy(); o.scale=s*.88; o.keyframe_insert("scale",frame=a)
        o.scale=s; o.keyframe_insert("scale",frame=min(b,a+7))

def line(name, pts, bevel, material):
    c=bpy.data.curves.new(name,"CURVE"); c.dimensions="3D"; c.bevel_depth=bevel; c.bevel_resolution=4
    sp=c.splines.new("POLY"); sp.points.add(len(pts)-1)
    for i,p in enumerate(pts): sp.points[i].co=(*p,1)
    o=bpy.data.objects.new(name,c); c.materials.append(material); bpy.context.collection.objects.link(o); return o

def arc(name, pct, radius, z, material):
    pct=max(0,min(1,pct)); n=max(8,int(72*pct)); start=math.radians(225); span=math.radians(270)*pct
    return line(name,[(radius*math.cos(start+span*i/n),.12,z+radius*math.sin(start+span*i/n)) for i in range(n+1)],.035,material)

def build(data,args):
    bpy.ops.object.select_all(action="SELECT"); bpy.ops.object.delete(use_global=False)
    sc=bpy.context.scene; f=data["format"]; fps=int(f["fps"])
    sc.render.resolution_x=int(f["width"]); sc.render.resolution_y=int(f["height"]); sc.render.resolution_percentage=100
    sc.render.fps=fps; sc.frame_start=1; sc.frame_end=int(float(f["durationSec"])*fps)
    sc.render.image_settings.file_format="FFMPEG"; sc.render.ffmpeg.format="MPEG4"; sc.render.ffmpeg.codec="H264"
    sc.render.ffmpeg.constant_rate_factor="HIGH"; sc.render.ffmpeg.ffmpeg_preset="GOOD"; sc.render.ffmpeg.audio_codec="AAC"
    sc.render.filepath=str(Path(args.output_video).resolve())
    if args.engine=="cycles":
        sc.render.engine="CYCLES"; sc.cycles.samples=128; sc.cycles.use_denoising=True
    else: sc.render.engine="BLENDER_EEVEE_NEXT"

    w=bpy.data.worlds.new("MYEONG World") if not bpy.data.worlds else bpy.data.worlds[0]
    sc.world=w; w.use_nodes=True; bg=w.node_tree.nodes.get("Background")
    bg.inputs["Color"].default_value=rgba("#07090D"); bg.inputs["Strength"].default_value=.16

    cd=bpy.data.cameras.new("Camera"); cam=bpy.data.objects.new("Camera",cd); bpy.context.collection.objects.link(cam)
    cam.location=(0,-13.5,1); cd.lens=58; look(cam,(0,0,1)); sc.camera=cam
    focus=bpy.data.objects.new("Focus",None); focus.location=(0,0,1); bpy.context.collection.objects.link(focus)
    cd.dof.use_dof=True; cd.dof.focus_object=focus; cd.dof.aperture_fstop=3.2

    for name,loc,energy,size in [("Key",(-4,-4,7),1050,5),("Rim",(4,1,6),900,4),("Fill",(0,-2,-1),500,3.5)]:
        ld=bpy.data.lights.new(name,"AREA"); ld.energy=energy; ld.shape="DISK"; ld.size=size
        o=bpy.data.objects.new(name,ld); o.location=loc; look(o,(0,0,1)); bpy.context.collection.objects.link(o)

    gold=mat("Gold","#D9B76E",.75,.2,.15); ivory=mat("Ivory","#F2EEE4",.05,.35,.08)
    blue=mat("WaterAccent","#4CA7D8",.35,.25,1.2); red=mat("AlertAccent","#C65B57",.2,.3,.8)
    dim=mat("Dim","#49505A",.35,.45,.1); ft=font_load(args.font)

    bpy.ops.mesh.primitive_plane_add(size=40,location=(0,2.3,1),rotation=(math.radians(90),0,0))
    bpy.context.object.data.materials.append(mat("Backdrop","#0B0E14",.05,.8))
    for i,r in enumerate((2.5,3.5,4.5)):
        bpy.ops.mesh.primitive_torus_add(major_radius=r,minor_radius=.012+i*.004,location=(0,.7,1),rotation=(math.radians(90),0,0))
        bpy.context.object.data.materials.append(gold if i==1 else dim)

    random.seed(19850110)
    for i in range(36):
        bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1,radius=random.uniform(.008,.025),
            location=(random.uniform(-4.8,4.8),random.uniform(0,1.3),random.uniform(-5,7)))
        bpy.context.object.data.materials.append(ivory if i%4 else gold)

    facts=data["facts"]
    for s in data["scenes"]:
        a=max(1,round(s["start"]*fps)+1); b=min(sc.frame_end,round(s["end"]*fps)); objs=[]
        k=s["kind"]
        if k=="hook":
            objs=[text("HookA",s["heading"],(0,0,2),.78,ivory,ft),text("HookB",s["emphasis"],(0,0,.75),.86,gold,ft)]
        elif k=="palja":
            objs=[text("PaljaTitle",s["heading"],(0,0,4.2),.56,ivory,ft)]
            for i,(x,p) in enumerate(zip((-2.4,-.8,.8,2.4),facts["pillars"])):
                objs.append(text("Pillar"+str(i),p,(x,0,1),1.05,gold if i==2 else ivory,ft,.035,.01))
            objs.append(text("PaljaNote",s["subheading"],(0,0,-2.3),.30,dim,ft,.006,.002))
        elif k=="metric":
            g=arc("WealthGauge",float(s["value"])/100,2.25,.8,blue); visible(g,a,b,False)
            objs=[text("WealthLabel","재물 기운",(0,0,2.2),.62,ivory,ft),
                  text("WealthValue",f'{float(s["value"]):.1f}%',(0,0,.55),1.12,blue,ft),
                  text("WealthLine",s["heading"],(0,0,-1.65),.38,ivory,ft)]
        elif k=="flow":
            objs=[text("FlowTitle",s["heading"],(0,0,3.8),.76,gold,ft),
                  text("FlowLeft","기술·표현",(-2.2,0,.7),.55,ivory,ft),
                  text("FlowArrow","→",(0,0,.7),.9,blue,ft),
                  text("FlowRight","돈",(2.2,0,.7),.6,gold,ft),
                  text("FlowSub",s["subheading"],(0,0,-1.55),.42,ivory,ft)]
        elif k=="reversal":
            g=arc("SelfGauge",float(s["value"])/100,2.25,.6,red); visible(g,a,b,False)
            objs=[text("TurnTitle",s["heading"],(0,0,3.7),.57,red,ft),
                  text("TurnValue",f'{float(s["value"]):.1f}%',(0,0,.55),1.15,red,ft),
                  text("TurnSub",s["subheading"],(0,0,-1.65),.38,ivory,ft)]
        elif k=="meaning":
            objs=[text("MeaningTitle",s["heading"],(0,0,2.25),.72,ivory,ft),
                  text("MeaningSub",s["subheading"],(0,0,.15),.43,gold,ft)]
        elif k=="conclusion":
            objs=[text("ConclusionA",s["heading"],(0,0,2),.68,ivory,ft),
                  text("ConclusionB",s["emphasis"],(0,0,.3),.64,gold,ft),
                  text("ConclusionC","MYEONG · 가상 명식 분석",(0,0,-2.25),.27,dim,ft,.004,.001)]
        for o in objs: visible(o,a,b)

    sc.use_nodes=True; nt=sc.node_tree; nt.nodes.clear()
    rl=nt.nodes.new("CompositorNodeRLayers"); gl=nt.nodes.new("CompositorNodeGlare")
    gl.glare_type="FOG_GLOW"; gl.quality="HIGH"; gl.threshold=1; gl.size=6
    cp=nt.nodes.new("CompositorNodeComposite"); nt.links.new(rl.outputs["Image"],gl.inputs["Image"]); nt.links.new(gl.outputs["Image"],cp.inputs["Image"])

    if args.audio and os.path.exists(args.audio):
        if sc.sequence_editor is None: sc.sequence_editor_create()
        sc.sequence_editor.strips.new_sound("Narration",str(Path(args.audio).resolve()),channel=1,frame_start=1)
    return sc

def main():
    args=cli()
    with open(args.input,encoding="utf-8") as f: data=json.load(f)
    build(data,args)
    bpy.ops.wm.save_as_mainfile(filepath=str(Path(args.output_blend).resolve()))
    print("[MYEONG] saved",Path(args.output_blend).resolve())
    if args.render:
        bpy.ops.render.render(animation=True)
        print("[MYEONG] rendered",Path(args.output_video).resolve())

if __name__=="__main__": main()
