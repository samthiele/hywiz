from setuptools import setup

setup(
    name='hywiz',
    version='0.15',
    packages=['hywiz', 'hywiz.jsapp', 'hywiz.jsapp.static',
              'hywiz.jsapp.static.css','hywiz.jsapp.static.js'],
    url='',
    license='',
    author='Sam Thiele',
    author_email='s.thiele@hzdr.de',
    description='',
    include_package_data=True,
    install_requires=['hylite', 'flask'],
    package_data = {"":["*.html",
                        "*.css","*.css.map","*.lua",
                        "*.js","*.js.map","*.com",
                        "*.png","*.json","*.txt"]}
)
