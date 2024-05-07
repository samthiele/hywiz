import unittest
from hycore import get_sandbox, empty_sandbox, loadShed
import numpy as np
import os
import glob

clean = False
class TestShed(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        """
        Construct a directory containing dummy data for processing
        :return: a file path to the directory
        """
        # get sandbox directory
        if clean:
            empty_sandbox()
        cls.sandbox = get_sandbox()

        # try loading pre-existing shed
        if os.path.exists( os.path.join( cls.sandbox, 'eldorado.shed' ) ):
            cls.S = loadShed(os.path.join( cls.sandbox, 'eldorado.shed' ) )
        else:
            cls.S = get_sandbox(fill=True, vis=True, mosaic=True) # didn't work; build it
            cls.S.updateMosaics(res=2e-3, files=['FENIX.png', 'LWIR.png', 'BR_Clays.png'])

        # create markdown description
        cls.S.createAboutMD( author_name='Sam Thiele')
        
    @classmethod
    def tearDownClass(cls):
        # delete sandbox directory
        if clean:
            empty_sandbox()


    def test001_build_web(self):
        from hywiz._static import getWebDir, copyImages, buildWeb

        # create output directory
        web, img = getWebDir(self.S, setup=True)
        print(img)

        # copy images
        nimg, sensors, results = copyImages( self.S, img )
        print("Copied %d images to %s" % (nimg, img))
        assert nimg > 0

        # test buildWeb function too (though this should be a duplicate of the above code)
        buildWeb( self.S, mosaic_step= 2, tray_step=2, clean=False,
                  sensors=['FENIX'], results={'':''},
                   crop=True, compile=False )
        print("O", web)
        print(os.path.join( web, "**/FENIX.png") )
        fx = glob.glob( os.path.join( web, "**/FENIX.png"), recursive=True )
        lw = glob.glob( os.path.join( web, "**/LWIR.png"), recursive=True )
        rs = glob.glob( os.path.join( web, "**/BR_Clays.png"), recursive=True )
        self.assertEqual(len(lw), 0) # check no LWIR in output
        self.assertEqual(len(rs), 0) # check no clays in output
        self.assertGreater(len(fx), 0 ) # check fenix is in otuput

        # now build full web 
        buildWeb( self.S, mosaic_step= 2, tray_step=2, clean=False,
                  sensors=['FENIX','LWIR'], results={'BR_Clays':'LEG_Clays'},
                   crop=False, compile=True )
        
        fx = glob.glob( os.path.join( web, "**/FENIX.png"), recursive=True )
        lw = glob.glob( os.path.join( web, "**/LWIR.png"), recursive=True )
        rs = glob.glob( os.path.join( web, "**/BR_Clays.png"), recursive=True )
        self.assertGreater(len(lw), 0) # check LWIR in output
        self.assertGreater(len(rs), 0) # check clays in output
        self.assertGreater(len(fx), 0 ) # check fenix is in output

        # check load index function
        from hywiz._static import loadCompiledShedIndex
        index = loadCompiledShedIndex(web)
        self.assertTrue( 'about' in index )

        # check compile index function
        from hywiz._static import compileShedIndex
        index["test"] = True # add some new info
        compileShedIndex( index, web )
        index2 = loadCompiledShedIndex(web)
        self.assertTrue( 'test' in index2 )

        # check add annotations function
        d = {"H01":{"annotations":{"Notes":{"note_Notes_0_100":{"type":"note","name":"Hi","Value":"There","start":0.1,"end":1.1}}}}}
        from hywiz._static import addAnnotations
        addAnnotations( web, d )
        self.assertTrue( "Notes" in loadCompiledShedIndex(web)['H01']['annotations'] )

        # and check it runs twice (merge happens properly)
        d = {"H01":{"annotations":{"Notes":{"note_Notes_100_200":{"type":"note","name":"Welcome","Value":"Home","start":1.1,"end":2.1}}}}}
        addAnnotations( web, d )
        self.assertTrue( "Notes" in loadCompiledShedIndex(web)['H01']['annotations'] )
        self.assertEqual( len(loadCompiledShedIndex(web)['H01']['annotations']["Notes"]), 2 )

        # and ... lastly ... test that clean works :-) 
        addAnnotations( web, {}, merge=False ) # this should remove all annotations
        self.assertTrue( "annotations" not in loadCompiledShedIndex(web)['H01'] )

if __name__ == '__main__':
    unittest.main()
