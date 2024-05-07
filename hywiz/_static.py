"""
A collection of functions for creating web-visualisation capability (static HTML sites) of hycore collections
using Jinja
"""

from hycore import loadShed
import sys, os
import glob
from jinja2 import Template, Environment, DictLoader, PackageLoader
from natsort import natsorted
import shutil
from tqdm import tqdm
import json
from PIL import Image
import numpy as np
import zipfile
from pathlib import Path

# get path to static folder
from hywiz import jsapp
STATIC = os.path.join( os.path.dirname( jsapp.__file__), 'static' )

def getWebDir(shed, setup=True):
    """
    Get the directory being used for building static web visualisations.

    :param: shed: The Shed instance being visualised.
    :param setup: True if this directory should be setup by copying e.g. static data files.
    :return:
        - web: A path to the output directory for web visualisations.
        - img: A path to the img directory for storing media.
    """

    # get web subdirectory
    web = os.path.join( os.path.dirname( shed.getDirectory() ), '%s_html'%shed.name )
    os.makedirs(web, exist_ok=True)  # make sure it exists!

    if setup:
        # copy static folder into output
        assert os.path.exists(STATIC), "Error - could not find static data at %s" % STATIC
        static = os.path.join( web, 'static' )
        if os.path.exists( static ):
            shutil.rmtree( static )
        shutil.copytree(STATIC, os.path.join(web, 'static'))

        # create img folder
        img = os.path.join(web, 'img')
        os.makedirs(img, exist_ok = True )
    return web, img

def copyWeb( shed, outdir, sensors : list = None, results : dict = None, js=True,
             mosaic_step : int = 1, tray_step : int = 1, crop : bool = False ):
    """
    Copy web files (index.html and associated javascript / css ) into the output directory. This includes
    constructing a json object (stored as a compressed blob in a .js script) that contains a map of this
    directory and the specified sensors and results files (for visualisation with the hyviz-ui).

    :param shed: The shed to build html files for.
    :param outdir: The output directory to save html files in.
    :param sensors: A list of sensor names to include in the outputs. This must match the preview image names. If None, all sensors will be exported.
    :param results: A dictionary of result images (keys) and associated legend images (values) to include in the output. If None, all results will be exported.
    :param js: If True, the index data will be saved as a js script for easy inclusion with static web apps. If False,
                it will be stored as a .json file to match the flask .../index.json endpoint.
    :param mosaic_step: Downsampling factor for mosaic images to reduce file size. Default is 1 (no downsampling).
    :param tray_step: Downsampling factor for tray images to reduce file size. Default is 1 (no downsampling).
    :param crop: Crop trays to masked areas to reduce file size. Default is False.
    :return: A path to the index html file.
    """

    # save index.json file
    from hywiz._flask import getShedIndexComplete, getShedIndexJS
    os.makedirs(os.path.join(outdir, 'map'), exist_ok=True)
    pbar = tqdm(total=2, desc="Building map", leave=False)
    if js:
        index = getShedIndexJS( shed, compress=True,
                               sensors=sensors, 
                               results=results,
                               mask=crop  )
        pbar.update(1)
        with open(os.path.join(outdir, 'map/index.js'), 'w') as f:
            f.write(index)
    else:
        index = getShedIndexComplete( shed, 
                                    sensors=sensors, 
                                    results=results,
                                    mask=crop )
        pbar.update(1)
        with open( os.path.join(outdir, 'map/index.json'), 'w') as f:
            json.dump( index, f )
    pbar.close()
    
    # copy other web files
    files = glob.glob(jsapp.root + "/*")
    for f in files:
        if os.path.isdir(f):
            shutil.copytree( f, 
                            os.path.join( outdir, os.path.basename(f) ),
                             dirs_exist_ok=True )
        else:
            shutil.copy( f, outdir )

    # copy redbean file up one directory
    shutil.move( os.path.join(outdir,'redbean-tiny-2.2.com'),
                 os.path.join(os.path.dirname(outdir),'%s.bean.exe.command'%shed.name))
    
    return os.path.join(outdir, 'shedIndex.html')

def copyImages( shed  , imgdir : str, sensors : list = None, results : dict = None,
                mosaic_step : int = 1, tray_step : int = 1, crop : bool = False, **kwds ):
    """
    Copy .png preview images into the web output directory.

    :param shed: The shed to pull data from.
    :param imgdir: The image directory to copy to. Can be created using getWebDir( ... ).
    :param sensors: A list of sensor names to export to the web directory. If None (default) all sensors will be exported.
    :param results: A dict with result names to export (keys) and corresponding legend names (values). To disable, pass an empty list.
    :param legend_prefix: Prefix used to denote legend images in results directory.
    :param mosaic_step: Downsampling factor for mosaic images to reduce file size. Default is 1 (no downsampling).
    :param tray_step: Downsampling factor for tray images to reduce file size. Default is 1 (no downsampling).
    :param crop: Crop trays to masked areas to reduce file size. Default is False.
    :keywords: keywords are all passed to shed.exportQuanta(...).
    :return:
        - nimg: the total number of images copied.
        - sensor_list: a list of sensor image files found
        - result_list: a list of result image files found.
    """

    # get shed index and gather result and sensor names
    from hywiz._flask import getSensorsAndResults
    if (sensors is None) and (results is None):
        sensors, results = getSensorsAndResults( shed )
    elif (sensors is None):
        sensors = shed.getSensors()
    elif (results is None):
        _ , results = getSensorsAndResults( shed )
    
    # export files and spectral quanta
    shed.exportQuanta(path=imgdir, clean=True, crop=crop, 
                      sensors=list(sensors), 
                      results=list(results.keys()), ss = tray_step,
                      **kwds )

    # export legends
    for k,v in results.items():
        l = glob.glob( os.path.join( shed.getDirectory(), '**/%s.png' % v ), recursive=True )
        if len(l) > 0:
            os.makedirs(os.path.join(os.path.dirname(imgdir), 'leg'), exist_ok=True)
            shutil.copy(l[0], os.path.join( os.path.dirname(imgdir), 'leg') )

    # copy any pole or fence mosaics
    # (this matches the /<hole>/pole/<image.png>
    #  and /<hole>/fence/<image.png> endpoints.
    for h in tqdm(shed.getHoles(),desc="Copying mosaics", leave=False):
        for m in ['pole', 'fence']:
            try:
                p = h.results.get(m).getDirectory()
            except:
                continue # all good; but no mosaics here

            # make output directory and copy mosaics into it
            pth = os.path.join(os.path.join(imgdir, h.name), m)
            os.makedirs(pth, exist_ok=True)
            for i in glob.glob( os.path.join(p, '*.png')):
                name = os.path.splitext( os.path.basename(i) )[0]
                if (name in sensors) or (name in results): # only get mosaics we're asked too!
                    if mosaic_step > 1: # subsample?
                        im = Image.open(i)
                        im = np.array(im)[::mosaic_step, ::mosaic_step, :]
                        Image.fromarray(im).save( os.path.join( pth, os.path.basename(i) ) )
                    else:
                        shutil.copy(i, pth) # no drama lama

    nimg = len( glob.glob( os.path.join(imgdir,"**/*.png"), recursive=True ) )
    return nimg, list(sensors), results

def buildWeb(shed, *, compile=True, clean=True, sensors : list = None, results : dict = None, 
             mosaic_step : int = 1, tray_step : int = 1, crop : bool = False, vb=True, **kwds):
    """
    Build a web output for the given shed using default settings.
    :param shed: The shed to convert to a web visualisation.
    :param compile: True if the resulting static site should be compiled into a cross-platform runnable redbean file. Default is True. 
    :param clean: If True (default) the directory used to assmble the redbean app is deleted. Thas has no effect if compile is False.
    :param sensors: A list of sensor names to export to the web directory. If None (default) all sensors will be exported.
    :param results: A dict with result names to export (keys) and corresponding legend names (values). To disable, pass an empty list.
    :param mosaic_step: Downsampling factor for mosaic images to reduce file size. Default is 1 (no downsampling).
    :param tray_step: Downsampling factor for tray images to reduce file size. Default is 1 (no downsampling).
    :param crop: Crop trays to masked areas to reduce file size. Default is False.
    :param vb: True if print outputs should be created.
    :keywords: keywords are all passed to copyImages.

    :return: A path to the index.html file.
    """

    # create output directory
    web, img = getWebDir(shed, setup=True)

    # copy images
    nimg, sensors, results = copyImages(shed, img, sensors, results, 
                                        mosaic_step=mosaic_step, 
                                        tray_step=tray_step, crop=crop,**kwds )
    if vb:
        print("Copied %d images to output directory (%s)." % (nimg, img))
        print("\t Output sensors are: %s" % sensors)
        if len(results) > 0:
            print("\t Output results are: ")
            for k,v in results.items():
                print("\t\t %s (legend: %s)" % (k,v))

    # copy html data
    out = copyWeb( shed, web, sensors, results, js=True, 
                                        mosaic_step=mosaic_step, 
                                        tray_step=tray_step, crop=crop )

    bean = os.path.join( os.path.dirname( web ), "%s.bean.exe.command"%shed.name )
    if compile:
        # and combine everything into a funky redbean thingy!!
        with zipfile.ZipFile(bean, 'a') as zf:
            for f in glob.glob(os.path.join(web,'**/*.*'), recursive=True):
                if (os.path.isfile(f)) \
                    and ('.lua' not in f) \
                        and ('__' not in f):
                        zf.write(f,os.path.join( '/hywiz', os.path.relpath(f,web)) )
            zf.write(os.path.join(web,'init.lua'),'/.init.lua') # also copy init file
        
        # set as executable file (unix)
        os.chmod(bean, 0o555) 

        # and remove web directory
        if clean:
            shutil.rmtree(web)

        return bean
    else:
        # remove redbean file
        os.remove( bean )
        return out
    
def loadCompiledShedIndex( path : str ):
    """
    Utility function that opens and decompresses the JSON data stored in a index.js shed index within an (exported) static hywiz site.

    :param path: Path to the js file to load. This must be created by `buildWeb(...)` or similar, and is typically located
                 stored as /map/index.js within the relevant site. Optionally the root directory of the site can also be passed,
                 and the index.js file looked for within this as outlined above.
    """
    if ".js" not in path:
        assert os.path.exists( path ), "Error: Path %s does not exist"%path
        path = os.path.join( path , 'map/index.js')
    assert os.path.exists( path ), "Error: File %s does not exist"%path

    # read js file and get our compressed blob
    str = Path(path).read_text()
    assert "b64=" in str, "Error: Loaded .js file does not contain a valid shed index."
    str=str.split("b64=")[1][1:-2]
    
    import base64, zlib
    bits = base64.b64decode( str, validate=True )
    bits = zlib.decompress( bits ).decode('utf-8')
    assert bits[0] == "{", "Error: Loaded .js file does not contain a valid shed index."
    assert bits[-1] == "}", "Error: Loaded .js file does not contain a valid shed index."

    # convert to a dict and return
    import json
    return json.loads( bits )
    
def compileShedIndex( index, path ):
    """
    Compile a shed index dictionary (as returned by `loadCompiledShedIndex(...)`) back to a compressed .js file.

    :param index: The index dictionary to compile.
    :param path: The name of the file to compile/save it too. This can be a .js file, or a web directory (see path
                argument for `loadCompiledShedIndex`).
    """

    import base64, zlib
    bts = json.dumps(index, separators=(',', ':') )
    bts = zlib.compress(bts.encode('utf-8'))

    # write a little script that loads our compressed data chunk
    out = 'var b64="'
    out += str(base64.b64encode(bts))[2:-1]
    out += '";'

    if ".js" not in path:
        path = os.path.join( path, 'map/index.js' )
    with open(path, 'w') as f:
        f.write(out)

def addAnnotations( path, annot, merge=True):
    """
    Read annotations from a dict or json file and add them to the specified static site. Good for incorporation or editing
    annotations without recompiling a complete site. 

    :param path: Path to the js file to load. This must have been created by `buildWeb(...)` or similar, and is typically located
                 stored as /map/index.js within the relevant site. Optionally the root directory of the site can also be passed,
                 and the index.js file looked for within this as outlined above.
    :param annot: A dictionary or .json file containing the annotation information, in the structure saved by the hywiz viewer.
    :param merge: True if annotations should be combined with any pre-existing ones. If False, other annotation information will be removed
                  before these new ones are added.
    """
    # load shed index
    index = loadCompiledShedIndex(path)

    # load annotation info
    if isinstance( annot, str ) or isinstance(annot, Path ):
        annot = json.loads( Path(annot).read_text() )
    assert isinstance(annot, dict), "Error - `annot` should be a dict or a file path (string)"

    # clear previous annotations?
    if merge==False:
        for k,v in index.items():
            if isinstance(v, dict) and ('annotations' in v):
                del v['annotations'] # remove annotations

    # add in new ones
    for k,v in annot.items():
        if isinstance(v,dict) and "annotations" in v: # loop through annotations for each hole
            for g,A in v["annotations"].items(): # loop through annotation groups
                for n,a in A.items():

                    # some housekeeping
                    if k not in index:
                        index[k] = {}
                    if "annotations" not in index[k]:
                        index[k]["annotations"] = {}
                    if g not in index[k]["annotations"]:
                        index[k]["annotations"][g] = {}
                    
                    # copy annotation itself
                    index[k]["annotations"][g][n] = a

    #for k,v in index.items():
    #    if isinstance(v,dict) and "annotations" in v:
    #        print(v["annotations"])

    # save shed index
    compileShedIndex(index, path)


if __name__ == '__main__':

    # load shed
    S = loadShed('/Users/thiele67/Documents/Python/hywiz/sandbox/eldorado.shed')

    # build web!
    buildWeb(S)
