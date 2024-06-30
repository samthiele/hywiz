"""
A utility toolbox for launching a Flask hyperspectral visualisation server or exporting
static visualisation web apps.
"""

# really only 3 functions need to be accessible here! :-)
from ._flask import init, launch
from ._static import buildWeb

# expose these for pdoc
__all__ = [init, launch, buildWeb]
