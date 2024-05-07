"""
A web app for serving HSI data to front-end applications (e.g., web, AR, etc.).

Inspired by the WMS (web map server), this script runs a simple
HTTPS server that can retrieve hyperspectral images from disk and serve
PNG previews (false colour images, band ratios etc.) or specific pixel spectra to a remote client.

Additionally, this server will emulate the static exported html site for viewing / navigating through
a HSI coreshed.
"""

import os
from flask import Flask, render_template, send_file, abort, url_for, request, Response
from flask import jsonify, send_from_directory
from natsort import natsorted
import glob
import numpy as np
import json
import hylite
from hylite import io
import os
from PIL import Image
from hycore import Shed

from hywiz import jsapp

def getBoxesInHole(shed, hole):
    """
    Return a list of boxes in the specified hole.

    :param shed: Our Shed instance
    :param hole: A Hole instance or string name.
    :return: A dictionary describing this hole.
    """
    # find our hole
    if isinstance(hole, str):
        try:
            hole = shed.getHole(hole)
        except:
            return None
    return [b.name for b in hole.getBoxes()]

def getBoxContents(shed, hole, box, sensors=None, results=None, mask=False):
    """
    Get a dictionary describing the contents of the specified box.
    :param shed: A Shed instance containing everything
    :param hole: Hole instance or hole name string
    :param box: Box instance or box name string
    :param sensors: Sensors to include. Defaults to None (all sensors).
    :param results: Results to include. Defaults to None (all results).
    :param mask: True if image dimensions should be clipped to masked area.
    :return:
    """
    # parse hole if needed
    if isinstance(hole, str):
        try:
            hole = shed.getHole(hole)
        except:
            return None

    # parse box if needed
    if isinstance(box, str):
        try:
            box = hole.getBox( box )
        except:
            return None

    # load header and get general data
    out = dict(start = round(box.start,2), end = round(box.end,2) )

    # get sensors
    out['sensors'] = {}
    if sensors is None:
        sensors = box.getSensors()
    for s in sensors:
        # peek at image size and store
        try:
            if not (mask and hasattr(box, 'mask') ) :
                im = Image.open(os.path.join(box.getDirectory(), '%s.png' % s))
                out['sensors'][s] = dict(dims=[im.size[0],im.size[1]], leg='')
                out['dims'] = [im.size[0],im.size[1]]
            else:
                from hycore.templates import get_bounds
                xmin, xmax, ymin, ymax = get_bounds(box.mask)
                out['sensors'][s] = dict(dims=[xmax-xmin,ymax-ymin], leg='')
                out['dims'] = [xmax-xmin,ymax-ymin]
        except:
            out['sensors'][s] = dict(dims=[0,0], leg='')  # image not found.

    # get results and legends
    legend_prefix = 'LEG'
    out['results'] = {}  # keys are results, values are legend images
    rfiles = glob.glob(os.path.join(box.results.getDirectory(), "*.png"))
    for i in rfiles:
        # check this is a result we're looking for
        if results is not None:
            if os.path.splitext( os.path.basename(i) )[0] not in results:
                continue # skip this one

        # get results images and corresponding legends
        if legend_prefix.lower() in os.path.basename(i).lower():
            continue  # ignore, for now
        else:
            # find matching legend
            r = os.path.splitext(os.path.basename(i))[0]
            out['results'][r] = dict(leg='')  # no legend
            for l in rfiles:
                l = os.path.splitext(os.path.basename(l))[0]
                if (legend_prefix in l) and (l.split(legend_prefix)[-1].lower() in os.path.basename(i).lower()):
                    out['results'][r] = dict(leg=l)
                    break

        # add additional metadata on size
        for k,v in out['results'].items():
            # peek at image size
            try:
                if not (mask and hasattr(box, 'mask') ) :
                    im = Image.open(os.path.join(box.results.getDirectory(), '%s.png' % k))
                    out['results'][k]['dims'] = [im.size[0],im.size[1]]
                else:
                    from hycore.templates import get_bounds
                    xmin, xmax, ymin, ymax = get_bounds(box.mask)
                    out['sensors'][s] = dict(dims=[xmax-xmin,ymax-ymin], leg='')
            except:
                out['results'][k]['dims'] = [0,0] # image not found.
    return out

def getShedIndexSimple(shed):
    """
    Return a dictionary describing this shed (contained holes and boxes).
    :param shed: A Shed instance to describe.
    :return: A dictionary containing lists of holes and the boxes they contain.
    """
    out = {}
    out['name'] = shed.name
    holes = shed.getHoles()
    out['holes'] = []
    for h in holes:
        out[h.name] = [b.name for b in h.getBoxes()]
        out['holes'].append(h.name)
    shed.free()  # avoid potential memory leak
    return out

def getShedIndexComplete( shed, sensors=None, results=None, mask=False):
    """
    Return a dictionary describing the contents of this shed and their contents.
    :param shed: A Shed instance to describe.
        :param sensors: Sensors to include. Defaults to None (all sensors).
    :param results: Results to include. Defaults to None (all results).
    :param mask: True if image dimensions should be clipped to masked area.
    :return: A dictionary containing details on all holes, boxes and results in this shed.
    """
    out = getShedIndexSimple( shed )
    for h in shed.getHoles():
        out[h.name] = {}
        # out[h.name]['name'] = h.name  # redundant but useful
        out[h.name]['boxes'] = getBoxesInHole( shed, h )
        out[h.name]['length'] = round(h.scannedLength(),2)

        # add annotations
        out[h.name]['annotations'] = {}
        for k,v in h.header.items():
            if ('note' in k) or ('link' in k):
                typ,group,z0,z1 = k.split('_')
                z0=float(z0) / 100
                z1=float(z1) / 100
                if group not in out[h.name]['annotations']:
                    out[h.name]['annotations'][group] = {}
                name = v.split(',')[0]
                value = "".join(v.split(',')[1:])
                out[h.name]['annotations'][group][k] = dict(name=name, value=value, type=typ, start=z0, end=z1)

        # add boxes
        for b in h.getBoxes():
            out[h.name][b.name] = getBoxContents(shed, h, b, 
                                    sensors=sensors, results=results, mask=mask )

        # get depth info for mosaics (if present)
        for n in ['pole', 'fence']:
            T = None
            try:
                T = io.loadHeader( os.path.join( h.results.get(n).getDirectory(), 'template.hdr') )
            except:
                pass

            if T is not None:
                out[h.name][n] = dict( dims = [int(T['samples']), int(T['lines'])] )
                if 'depths' in T:
                    out[h.name][n]['depths'] = [round(z,4) for z in T.get_list('depths')]
    
    # also include wavelength information for each sensor
    boxes = shed.getBoxes()
    out['sensors'] = {}
    if sensors is None:
        sensors = shed.getSensors()
    for s in sensors:
        for b in shed.getBoxes():
            if hasattr(b, s):
                hdr = io.loadHeader( os.path.join(b.getDirectory(), s + '.hdr') )
                out['sensors'][s] = [round(w,0) for w in hdr.get_wavelengths()]
                break
        
    # also include About markdown string
    # get / load markdown file
    pth = os.path.join(shed.getDirectory(), "about.md")
    if not os.path.exists(pth):
        shed.createAboutMD(author_name="Anonymous")
    with open(os.path.join(shed.getDirectory(), 'about.md'), 'r') as f:
        out['about'] = ''.join(f.readlines())

    return out

def getShedIndexJS( shed, compress=False, **kwds ):
    """
    Get a ShedIndex, but as a .js script containing data = { ... } for easy loading.
    :param shed: The shed to pass to getShedIndexComplete.
    :param compress: If True, the returned js file will contain compressed data to reduce file size.
    :keywords: Keywords are passed to  getShedIndexComplete(...).
    :return: A string containing javascript code to define a data object.
    """
    data = getShedIndexComplete(shed, **kwds)
    if not compress:
        out = "var data ="
        out += json.dumps(data, separators=(',', ':'))
        out += ";"
    else:
        import base64, zlib
        bts = json.dumps(data, separators=(',', ':') )
        bts = zlib.compress(bts.encode('utf-8'))

        # write a little script that loads our compressed data chunk
        out = 'var b64="'
        out += str(base64.b64encode(bts))[2:-1]
        out += '";'

    return out

def getSensorsAndResults( shed ):
    """
    Get a list of the sensors and results images in this shed, as well as associated legends.

    :return sensors: A list of sensor names gathered from the shed.
    :return results: A dictionary with keys representing result names and values giving the location of the relevant legend image.
    """
    index = getShedIndexComplete( shed )
    def rfunc( k, v ): # recursively search index for results and sensors
        sensors = set()
        results = {}
        if 'results' in k: # we've found a key we're looking for
            for r,l in v.items():
                if r not in results: # don't have a legend for this result yet?
                    results[r] = l['leg']
                elif results[r] == '': # don't have a legend for this result yet?
                    results[r] = l['leg']
            return sensors, results
        if 'sensors' in k: # we've found a key we're looking for
            for s in v.keys():
                sensors.add(s)
            return sensors, results
        
        # nope; iterate or ignore.
        if isinstance(v, dict):
            for _k,_v in v.items():
                s,r = rfunc(_k,_v)
                sensors.update( s )
                results = {**results, **r }
        return sensors, results
    sensors, results = rfunc( 'root', index )
    return list(sensors), results

def init( shed : Shed ):
    """
    Build a flask app instance ready to be launched.
    :param shed: The Shed to serve.
    :return: A flask app.
    """
    app = Flask(__name__,
                static_url_path='/static',
                static_folder=jsapp.root)
    app.config['TEMPLATES_AUTO_RELOAD'] = True

    # setup HTTP requests
    @app.route('/map', methods=['GET'])
    @app.route('/map/', methods=['GET'])
    @app.route('/map.json', methods=['GET'])
    def shedmap():
        """
        :return: A JSON file with all the holes in this shed. Each hole will contain a list of box objects flagging
                 their name, UID, start depth and to depth.
        """
        out = getShedIndexSimple(shed)
        shed.free()  # avoid potential memory leak
        return jsonify(out)

    @app.route('/map/<hole>', methods=['GET'])
    @app.route('/map/<hole>/', methods=['GET'])
    @app.route('/map/<hole>.json', methods=['GET'])
    def holemap(hole):
        """
        :param hole: Name of the hole to map
        :return: A JSON file containing all boxes in the specified hole.
        """
        try:
            hole = shed.getHole(hole)
        except:
            return abort(404)

        out = getBoxesInHole(shed, hole)
        shed.free()  # avoid potential memory leak
        return jsonify(out)

    @app.route('/map/<hole>/<box>', methods=['GET'])
    @app.route('/map/<hole>/<box>/', methods=['GET'])
    @app.route('/map/<hole>/<box>.json', methods=['GET'])
    def boxmap(hole, box):
        """
        :param hole: Name of the hole containing the desired box.
        :param box: Name of the box.
        :return: A JSON file listing the available sensors, results and legends in the specified box.
        """
        try:
            box = shed.getBox(hole, box)
        except:
            return abort(404)  # drillcore or box not found

        out = getBoxContents(shed, hole, box)
        shed.free()  # avoid potential memory leak
        return jsonify(out)

    @app.route('/map/index')
    @app.route('/map/index/')
    @app.route('/map/index.json')
    def index():
        """
        Return a json file containing an index of this entire shed. This is structured as follows:

        {
           hole_1 = {
                depths = { pole = [....], fence = [....] }, // depths of each pixel in pole and fence mosaics
                ticks = { pole = [...], fence = [...] }, // depth ticks (in pixels) for each pole and fence mosaic
                box_1 = {
                    start = <start_depth>;
                    end = <end_depth>;
                    sensors = {...};
                    results = { ... };
                },
                ...
                box_n = { ... }
           }
        }
        """
        out = getShedIndexComplete(shed)
        shed.free()  # avoid potential memory leak
        return jsonify(out)

    @app.route('/map/index.js')
    def indexJS():
        """
        Get Shed index as a javascript file that declares the data variable. Mirrors functionality
        used by static apps to access data in .json format.
        """
        out = getShedIndexJS(shed, compress=True)
        shed.free()
        return Response( out, mimetype='text/javascript')

    @app.route('/leg/<legend>', methods=['GET'])
    @app.route('/leg/<legend>/', methods=['GET'])
    def get_legend( legend ):
        if "." not in legend:
            legend = legend + ".png"
        pth = glob.glob( os.path.join( shed.getDirectory(), '**/%s'%legend), recursive=True )
        if len(pth) > 0:
            return send_file(pth[0])
        return abort(404)
    
    @app.route('/img/<hole>/pole/<image>', methods=['GET'])
    @app.route('/img/<hole>/pole/<image>/', methods=['GET'])
    def get_pole_mosaic(hole, image):
        try:
            hole = shed.getHole(hole, create=False )
        except:
            return abort(404)  # hole not found

        if '.' not in image:
            image = image+".png"
        try:
            pth = os.path.join(hole.results.pole.getDirectory())
            pth = os.path.join(pth, image)
        except:
            return abort(404)  # mosaic not found
        shed.free()  # avoid potential memory leak
        return send_file(pth)  # send image :-)

    @app.route('/img/<hole>/<box>/spectra/<sensor>_lib.png')
    def getSpectraLibrary(hole, box, sensor):
        try:
            lib = shed.getHole(hole).getBox(box).spectra.get('%s_lib'%sensor)
        except:
            return abort(404)

        # serve as PNG image
        from PIL import Image
        import io
        data = np.clip( np.transpose( lib.data, (2,0,1) ) * 255, 0, 255 ).astype(np.uint8)
        img = Image.fromarray(data)
        file_object = io.BytesIO()
        img.save(file_object, 'PNG')
        file_object.seek(0)
        return send_file(file_object, mimetype='image/PNG')
    
    @app.route('/img/<hole>/<box>/spectra/<sensor>_idx.png')
    def getSpectraIndex(hole, box, sensor):
        try:
            idx = shed.getHole(hole).getBox(box).spectra.get('%s_idx'%sensor)
        except:
            return abort(404)
        
        # serve as PNG image
        from PIL import Image
        import io
        data= (np.clip( idx.data, 0, 255) * 255 ).astype(np.uint8)
        img = Image.fromarray(data[...,0].T,'L')
        file_object = io.BytesIO()
        img.save(file_object, 'PNG')
        file_object.seek(0)
        return send_file(file_object, mimetype='image/PNG')
    
    @app.route('/img/<hole>/fence/<image>', methods=['GET'])
    @app.route('/img/<hole>/fence/<image>/', methods=['GET'])
    def get_fence_mosaic(hole, image):
        try:
            hole = shed.getHole(hole, create=False)
        except:
            return abort(404)  # hole not found

        if '.' not in image:
            image = image + ".png"
        try:
            pth = os.path.join(hole.results.fence.getDirectory())
            pth = os.path.join(pth, image)
        except:
            return abort(404)  # mosaic not found
        shed.free()  # avoid potential memory leak
        return send_file(pth)  # send image :-)

    @app.route('/img/<hole>/<box>/<image>', methods=['GET'])
    @app.route('/img/<hole>/<box>/<image>/', methods=['GET'])
    def get_PNG(hole, box, image):
        """
        :return: Serve the requested PNG file from the box directory, using the URL: img/<hole>/<box>/<image>.png
                 If the image is not found in the box directory, we look in the results directory.
        """
        try:
            box = shed.getBox(hole, box)
        except:
            return abort(404)  # drillcore or box not found

        if '.' not in image:
            image = image + ".png"  # default to png files

        if os.path.exists(os.path.join(box.getDirectory(), image)):
            # serve file from box directory
            pth = os.path.join(box.getDirectory(), image)
        elif os.path.exists(os.path.join(box.results.getDirectory(), image)):
            # serve file from results directory
            pth = os.path.join(box.results.getDirectory(), image)
        else:
            return abort(404)  # drillcore or box not found

        shed.free()  # avoid potential memory leak
        return send_file(pth)  # send image :-)

    @app.route('/img/<hole>/<box>/results/<image>', methods=['GET'])
    @app.route('/img/<hole>/<box>/results/<image>/', methods=['GET'])
    def get_ResultsPNG(hole, box, image):
        """
        Serve a results png (wrapper)
        """
        return get_PNG(hole, box, image)
    

    # serve core React app files
    @app.route('/static/js/<path:path>')
    def appjs( path ):
        return send_from_directory( os.path.join(jsapp.static_pth,'js'), path)
    @app.route('/static/css/<path:path>')
    def appcss( path ):
        return send_from_directory( os.path.join(jsapp.static_pth,'css'), path)
    @app.route('/', defaults={'path': ''})
    @app.route('/<path:path>')
    def serve(path):
        print(jsapp.root, path)
        if path != "" and os.path.exists(jsapp.root + '/' + path):
            return send_from_directory(jsapp.root, path)
        else:
            return send_from_directory(jsapp.root, 'index.html')
    
    @app.route('/whs', methods=['POST'])
    @app.route('/whs/', methods=['POST'])
    def whs():
        """
        Process a web-hyperspectral query. This must be passed as a json object with the following format:

        `let request = { hole : <hole name>,
                     box : <box name> ,
                     sensor : <sensor name>,
                     operation : <operation string>,
                     [ x : 0, y : 0 ], # defaults if operation = 'probe'
                     [ vmin : 2, vmax : 98, method : "percent", tscale : False ] # defaults for false color normalisation
                     }`

        The `operation string` determines the data that will be returned, and should match the syntax defined by
        `hylite.HyData.eval( ... )`. For example, `b10+b9 | b12:b15 | b5/b6` would return a 3-band false colour image
        with R = band 10 + band 9, green = average( band 12 to band 15) and blue = band 5 / band 6. The `vmin`, `vmax`
        and `tscale` options control normalisation to a 0-255 uint png.

        Alternatively, operation can be "probe", in which case a JSON file containing the spectral profile
        (and associated wavelengths) will be returned. In this case, the request must also include an x and y field.


        :return:
        """
        data = request.json

        try:
            # get data from JSON request
            hole = data['hole']
            box = data['box']
            sensor = data['sensor']
            op = data['operation']

            if 'probe' in op.lower():
                x = data.get('x', 0)
                y = data.get('y', 0)
            else:
                vmin = data.get('vmin', 2)
                vmax = data.get('vmax', 2)
                tscale = data.get('tscale', False)
                method = data.get('method', 'percent')  # clip method, can be "percent" or "absolute"
                if "abs" in method.lower():  # absolute values [ use float as per hylite notation ]
                    vmin = float(vmin)
                    vmax = float(vmax)
                else:  # percentiles [ use int as per hylite notation ]
                    vmin = int(vmin)
                    vmax = int(vmax)
        except:
            return "Invalid query JSON", 400

        try:
            # load dataset
            box = shed.getBox(hole, box)
            data = box.get(sensor)
        except:
            return "Box does not exist", 400

        # get a pixel spectra
        if 'probe' in op.lower():
            out = {}
            out['wavelength'] = list(data.get_wavelengths().astype(float))
            out['units'] = 'nm'
            out['R'] = list(data.data[int(x), int(y), :].astype(float))
            return jsonify(out)

        # get a false colour image or band ratio
        else:
            # try:
            result = data.eval(op)  # evaluate result
            # except:
            #    return "Invalid operation", 400

            # apply normalisation
            if isinstance(vmin, int) and isinstance(vmax, int):
                result.percent_clip(vmin, vmax, per_band=tscale)
            else:
                result.data = (result.data - vmin) / (vmax - vmin)
            result.data = np.clip(result.data * 255, 0, 255).astype(np.uint8)
            if result.band_count() == 1:
                result.data = np.dstack([result.data] * 3)
            if result.band_count() > 3:
                result.data = result.data[..., :3]

            box.free()  # avoid possible memory leaks
            shed.free()  # avoid possible memory leaks

            # serve as PNG image
            from PIL import Image
            import io
            img = Image.fromarray(result.data)
            file_object = io.BytesIO()
            img.save(file_object, 'PNG')
            file_object.seek(0)

            return send_file(file_object, mimetype='image/PNG')

    return app

def launch( shed : Shed, https=False, port=5555, host="0.0.0.0" ):
    """
    Launch a hywiz server that serves HSI data from specified shed (with bubbles!)

    :param shed: The Shed directory to serve.
    :param https: True if an adhoc ssl context should be used to simulate https.
    """
    app = Flask(__name__)
    app.config['TEMPLATES_AUTO_RELOAD'] = True

    # init app
    app = init( shed )

    # run it
    if https:
        app.run(ssl_context='adhoc', port=port, host=host)
    else:
        app.run(port=port, host=host)

if __name__ == "__main__":
    # if we run this file, launch a flask app using adhoc SSL HTTPS
    from hycore import loadShed
    S = loadShed('/Users/thiele67/Documents/Python/hywiz/sandbox/eldorado.shed')
    print(len(S.getHoles()))

    launch( S, https=False )

    # try navigating to https://127.0.0.1:5000/
    # to see the dir_listing entry point in action

    # try navigating to: https://127.0.0.1:5000/whs?hole=hole1&box=box1
    # in your browser to see the get_HSI() entry point in action.
    # this is an example of our server responding to a GET query
    # and returning some (potentially relevant!) data :-)

