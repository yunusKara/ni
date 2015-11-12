#!/usr/bin/env python
# -*- coding: utf-8 -*-

import subprocess
import os
import shutil
import sys
import datetime

FILE_DIR = os.path.abspath(os.path.dirname(os.path.realpath(__file__)))
OUT_PATH = os.path.join(FILE_DIR, 'out')
SRC_PATH = os.path.join(FILE_DIR, 'app')

REPOSITORY = 'git@github.com:craft-ai/ni'
BRANCH = 'gh-pages'

def main():
    print "Publishing craft ai NEST, to '{}/{}'.".format(REPOSITORY, BRANCH)
    try:
        if os.path.exists(OUT_PATH):
            shutil.rmtree(OUT_PATH)

        shutil.copytree(SRC_PATH, OUT_PATH)

        subprocess.check_output(
            ["git", "init"],
            stderr=subprocess.STDOUT,
            cwd=OUT_PATH)

        subprocess.check_output(
            ["git", "checkout", "-B", BRANCH],
            stderr=subprocess.STDOUT,
            cwd=OUT_PATH)

        subprocess.check_output(
            ["git", "add", "*"],
            stderr=subprocess.STDOUT,
            cwd=OUT_PATH)

        subprocess.check_output(
            ["git", "commit", "--author=Companion Cube <companion@craft.ai>", "-mPublishing NI - {}".format(datetime.datetime.utcnow())],
            stderr=subprocess.STDOUT,
            cwd=OUT_PATH)

        subprocess.check_output(
            ["git", "remote", "add", "origin", REPOSITORY],
            stderr=subprocess.STDOUT,
            cwd=OUT_PATH)

        subprocess.check_output(
            ["git", "push", "origin", "+{}".format(BRANCH)],
            stderr=subprocess.STDOUT,
            cwd=OUT_PATH)
    except subprocess.CalledProcessError, e:
        raise RuntimeError("Error while publishing to git: {}".format(e.output))
        return 1

    return 0

if __name__ == "__main__" :
    sys.exit(main())