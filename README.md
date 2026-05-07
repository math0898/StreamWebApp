# StreamWebApp
A basic localhost stream web app that pulls data from a dashboard page to display on an overlay page. It may eventually use a small express server to update on restful API calls.

## Background music asset location

Place music assets under:

`/home/runner/work/StreamWebApp/StreamWebApp/public/Music/Album Name - Artist/`

Each album folder should contain:
- `cover.jpg` (album art shown in now-playing popup)
- `Song Name.mp3`/`.ogg`/`.wav` (audio files)

These files are served as web paths like `/Music/Album Name - Artist/Song Name.mp3`.
