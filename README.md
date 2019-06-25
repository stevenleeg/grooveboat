# 💃🛥️ Grooveboat
_Live (and soon-to-be peer to peer) DJing with your friends._

## What's this?
Grooveboat is an open-source clone of the late [Turntable.fm](https://en.wikipedia.org/wiki/Turntable.fm).
From wikipedia:

> The service allowed users to create "rooms," which other users could join.[3] Designated users, so-called "DJs," chose songs to be played to everyone in that room, while all users were able to talk with one another through a text interface.

## Cool, how does it work?
Grooveboat comes in two pieces: the frontend web app (this repository) and a
minimal-knowledge signaling server, called a [buoy](https://github.com/stevenleeg/groovebuoy).
You can spin up an instance of each project, share out a link and invite code
to your friends, and start grooving.

## Getting started
Running this repostitory should be relatively straightforward, just make sure
you have a recent version of node and [yarn](http://gitlab.com/stevenleeg/grooveboat) (or npm) installed.

Clone the repo:

```
$ git clone https://github.com/stevenleeg/grooveboat.git
```

Install dependencies:

```
$ yarn install
```

Spin up a local webserver:

```
$ yarn start
```

And you'll be ready to go. You can visit http://localhost:1234 to see the UI.
Note that changing the code will cause the development server to automatically
refresh.

If you wish to deploy this to a production environment, you can run:

```
$ yarn build
```

and copy the resulting files in `dist/` to a webserver. Note that the output is
a static HTML/Javascript/CSS directory- there's no backend, meaning you can
serve this directory on a standard webserver.

In order to start spinning music, you'll need to set up or connect to a [buoy](https://github.com/stevenleeg/groovebuoy).

## Contributing
See [CONTRIBUTING.md](https://github.com/stevenleeg/grooveboat/blob/master/CONTRIBUTING.md).

## License
This project is released under the MIT License, which can be found in [LICENSE.txt](https://github.com/stevenleeg/grooveboat/blob/master/LICENSE.txt).
