import unittest
from hycore import get_sandbox, empty_sandbox, loadShed
import os

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
        cls.S.createAboutMD(author_name='Sam Thiele')

    @classmethod
    def tearDownClass(cls):
        # delete sandbox directory
        if clean:
            empty_sandbox()

    def test001_launchserver(self):
        from hywiz._flask import init
        import json
        # get app
        app = init( self.S )
        self.assertTrue( app is not None )

        # get a test client
        client = app.test_client()

        # test images
        for e in ['', '.png']:
            # test image endpoints
            response = client.get("img/H01/pole/FENIX"+e)
            self.assertEqual(response.status_code, 200)

            response = client.get("img/H01/fence/FENIX" + e)
            self.assertEqual(response.status_code, 200)
            
            # test legends endpoint (sounds cool huh!)
            response = client.get("/leg/LEG_Clays"+e)
            self.assertEqual(response.status_code, 200)

        # test different urls
        for e in ['', '/', '.json']: # urls should work with the following endings
            data = json.loads(client.get("/map"+e).get_data(as_text=True))
            self.assertEqual( data['name'], 'eldorado' )
            self.assertTrue( len(data['H01']) > 2 )

            data = json.loads(client.get("/map/H01"+e).get_data(as_text=True))
            self.assertTrue(len(data) > 2)

            data = json.loads(client.get("/map/H01/b001"+e).get_data(as_text=True))
            self.assertEqual(data['start'], 0)
            self.assertEqual(data['end'], 4)
            self.assertTrue(len(data['sensors']) > 1 )
            self.assertTrue(len(data['results']) > 0 )

            data = json.loads(client.get("/map/index.json").get_data(as_text=True))
            self.assertTrue( 'H01' in data )
            self.assertGreater(len(data['holes']), 2)
            self.assertEquals(data['name'], 'eldorado')

        # check javascript ending
        data = client.get("/map/index.js").get_data(as_text=True)
        self.assertTrue('var' in data) # check we had some javascript response

        # test main pages
        for url in ['/index.html', '/holes.html', '/boxes.html' ]:
            data = client.get(url)
            self.assertTrue(data is not None)

    def test002_compression(self):
        from hywiz._flask import getShedIndexJS, getShedIndexComplete

        # get non-compressed json string for reference
        tstr = getShedIndexJS( self.S, compress = False ) # this is what we should get after decoding
        tstr = tstr[tstr.index('{'):-tstr[::-1].index('}')]
        #with open( os.path.join( os.path.dirname( self.S.getDirectory() ), "test1.json" ), 'w' ) as f:
        #    f.write( tstr ) # write it for checking
        self.assertTrue( tstr[0] == "{" )
        self.assertTrue( tstr[-1] == "}" )
        print("\nSize of non-compressed json data is %d kb. " % ( len(tstr.encode('utf-8')) / 1000), end='')

        # get compressed json string
        cmp = getShedIndexJS( self.S, compress = True )
        cmp = cmp[cmp.index('"'):-cmp[::-1].index('"')][1:-1] # n.b. last bit drops the ' chars
        #with open( os.path.join( os.path.dirname( self.S.getDirectory() ), "test2.json" ), 'w' ) as f:
        #    f.write( cmp ) # write it for checking
        print("Size of compressed json data is %d kb." % (len(cmp.encode('utf-8')) / 1000))

        # check size... duh
        self.assertGreater( len(tstr.encode('utf-8')), len(cmp.encode('utf-8')) )


        # decode and check that we get what we started with!
        import base64, zlib
        bits = base64.b64decode( cmp, validate=True )
        bits = zlib.decompress( bits ).decode('utf-8')
        self.assertTrue(bits[0] == "{")
        self.assertTrue(bits[-1] == "}")

        #out += str(base64.b64encode(bts))[2:-1]
        
if __name__ == '__main__':
    unittest.main()
