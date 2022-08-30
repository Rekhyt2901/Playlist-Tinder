import { APIGet, loadPlaylists, createAlert, stopAllAudio } from "./functions.js";
import { getCurrentPlaylistId, getAccess_token } from "./main.js";
import { Tooltip } from "bootstrap";


async function addNewTinder() {
    document.getElementById("choose-playlists").style.display = "none";
    document.getElementById("loading").style.display = "flex";

    // Get tracks from selected playlists
    let selectedPlaylistIds = [];
    let chosenPlaylists = document.querySelectorAll("#choose-playlists-container .form-check");
    for (let i = 1; i < chosenPlaylists.length; i++) {
        let input = chosenPlaylists[i].querySelector(".form-check-input");
        if (!input.checked) continue;

        let id = input.getAttribute("playlistId");
        selectedPlaylistIds.push(id);
    }

    let checkedSavedSongs = document.querySelector("#choose-playlist-template .form-check-input").checked;
    if (!checkedSavedSongs && selectedPlaylistIds.length <= 0) {
        createAlert("Please select playlists to add songs from.", "danger")
        document.getElementById("loading").style.display = "none";
        document.getElementById("choose-playlists").style.display = "";
        return;
    }

    let tracks = [];
    for (let selectedPlaylistId of selectedPlaylistIds) {
        let fetchedPlaylist = await APIGet("playlists/" + selectedPlaylistId);
        let fetchedPlaylistTracks = fetchedPlaylist.tracks;

        tracks.push(...fetchedPlaylistTracks.items);
        while (fetchedPlaylistTracks.next) {
            fetchedPlaylistTracks = await APIGet(fetchedPlaylistTracks.next.split("v1/")[1]);
            tracks.push(...fetchedPlaylistTracks.items);
        }
    }
    if (checkedSavedSongs) {
        let savedSongs = await APIGet("me/tracks?limit=50");
        tracks.push(...savedSongs.items);
        while (savedSongs.next) {
            savedSongs = await APIGet(savedSongs.next.split("v1/")[1]);
            tracks.push(...savedSongs.items);
        }
    }


    // remove duplicates
    function uniq_fast(a) {
        let seen = {};
        let out = [];
        let len = a.length;
        let j = 0;
        for (let i = 0; i < len; i++) {
            let item = a[i];
            if (!item.track) continue;
            if (seen[item.track.uri] !== 1) {
                seen[item.track.uri] = 1;
                out[j++] = item;
            }
        }
        return out;
    }
    tracks = uniq_fast(tracks);

    // remove un-uploadable local tracks
    tracks = tracks.filter(n => n.track.uri.indexOf("spotify:local:") == -1);


    let addToPlaylist = [];


    // Set Playlist (at top)
    let playlist = await APIGet("playlists/" + getCurrentPlaylistId());
    let chosenPlaylistNode = document.getElementById("add-new-playlist");
    document.getElementById("add-new-playlist-title").textContent = playlist.name;


    let image = playlist.images.length > 0 ? playlist.images[0] : "none";
    if (image !== "none") chosenPlaylistNode.querySelector("img").setAttribute("src", image.url);


    // don't show tracks which are already in the playlist
    let tempPlaylistTracks = playlist.tracks.items;
    tracks = tracks.filter(track => {
        if (!track.track) return false;
        let hasIt = false;
        tempPlaylistTracks.forEach(ptrack => {
            if (!ptrack.track) return;
            if (ptrack.track.id == track.track.id) hasIt = true;
        });
        return !hasIt;
    });


    // Remove old cards
    while (document.getElementById("add-new-tinder-cards-container").childElementCount > 1) {
        document.getElementById("add-new-tinder-cards-container").removeChild(document.getElementById("add-new-tinder-cards-container").lastChild);
    }

    for (let track of tracks) {
        let node = document.getElementById("add-new-tinder-card-template").cloneNode(true);
        node.style.display = "";
        node.setAttribute("id", "");

        if (!track.track) continue;

        // if (track.track.album.images.length > 0) node.querySelector(".tinder-card-image").setAttribute("src", track.track.album.images[0].url);
        if (track.track.album.images.length > 0) node.querySelector(".tinder-card-image").setAttribute("srcData", track.track.album.images[0].url);

        node.querySelector(".tinder-card-title").textContent = track.track.name;

        let artists = track.track.artists.reduce((a, c) => a + c.name + ", ", "");
        node.querySelector(".tinder-card-artists").textContent = artists.slice(0, -2);


        let songPreview = track.track.preview_url;
        // preview is unavailable
        if (songPreview == null) {
            let icon = node.querySelector(".play-preview i");
            icon.classList.remove("bi-play-circle-fill");
            icon.classList.add("bi-exclamation-circle-fill");

            icon.setAttribute("data-bs-toggle", "tooltip");
            icon.setAttribute("data-bs-title", "Preview is Unavailable");
            icon.setAttribute("data-bs-placement", "top");
            new Tooltip(icon);
        } else {
            // create audio element
            node.setAttribute("audioPreviewSrc", songPreview);

            // let newAudio = document.createElement("audio");
            // newAudio.setAttribute("src", songPreview);
            // node.appendChild(newAudio);
        }


        node.querySelector(".play-preview").onclick = () => {
            let icon = node.querySelector(".play-preview i");
            if (icon.classList.contains("bi-exclamation-circle-fill")) return;
            if (icon.classList.contains("bi-play-circle-fill")) {
                stopAllAudio();

                node.querySelector("audio").play();

                icon.classList.remove("bi-play-circle-fill");
                icon.classList.add("bi-stop-circle-fill");
            } else {
                stopAllAudio();

                icon.classList.remove("bi-stop-circle-fill");
                icon.classList.add("bi-play-circle-fill");
            }
        }

        node.setAttribute("song-uri", track.track.uri);
        document.getElementById("add-new-tinder-cards-container").append(node);
    }

    // show track progress in corner
    updateProgress();

    // TINDER //
    let allCards = document.querySelectorAll('#add-new-tinder-cards-container .tinder--card');
    function initCards() {
        let newCards = document.querySelectorAll('#add-new-tinder-cards-container .tinder--card:not(.removed)');

        newCards.forEach(function (card, index) {
            card.style.zIndex = allCards.length - index;

            let scale = (20 - (index - 1)) / 20;
            if (scale < 0.1) scale = 0.1;

            card.style.transform = 'scale(' + scale + ')';

            let bottomOffset = (20 * (index - 1));
            if (bottomOffset > 60) bottomOffset = 60;

            card.style.bottom = "calc(" + bottomOffset + "px" + " + 9rem)";
            if (document.body.clientWidth <= 850) card.style.bottom = "calc(" + bottomOffset + "px" + " + 6rem)";
            if (document.body.clientWidth <= 660) card.style.bottom = "calc(" + bottomOffset + "px" + " + 7rem)";


            // lazy loading of images and song previews
            let srcData = card.querySelector(".tinder-card-image").getAttribute("srcData");
            if (index <= 10 && srcData) {
                card.querySelector(".tinder-card-image").setAttribute("src", srcData);
            }

            let audioPreviewSrc = card.getAttribute("audioPreviewSrc");
            if (index <= 10 && audioPreviewSrc) {
                let newAudio = document.createElement("audio");
                newAudio.setAttribute("src", audioPreviewSrc);
                card.appendChild(newAudio);
            }
        });

        document.getElementById("add-new-tinder-container").classList.add('loaded');
    }
    initCards();

    allCards.forEach(function (el) {
        let hammertime = new Hammer(el);

        hammertime.on('pan', function (event) {
            el.classList.add('moving');
        });

        hammertime.on('pan', function (event) {
            if (event.deltaX === 0) return;
            if (event.center.x === 0 && event.center.y === 0) return;

            let xMulti = event.deltaX * 0.03;
            let yMulti = event.deltaY / 80;
            let rotate = xMulti * yMulti;

            event.target.style.transform = 'translate(' + event.deltaX + 'px, ' + event.deltaY + 'px) rotate(' + rotate + 'deg)';
        });

        hammertime.on('panend', function (event) {
            el.classList.remove('moving');

            let moveOutWidth = document.body.clientWidth;
            let keep = Math.abs(event.deltaX) < 80 || Math.abs(event.velocityX) < 0.5;

            
            if (keep) {
                event.target.classList.toggle('removed', !keep);
                event.target.style.transform = '';
            } else {
                deleteLastRemovedCard();

                event.target.classList.toggle('removed', !keep);

                let endX = Math.max(Math.abs(event.velocityX) * moveOutWidth, moveOutWidth);
                let toX = event.deltaX > 0 ? endX : -endX;
                let endY = Math.abs(event.velocityY) * moveOutWidth;
                let toY = event.deltaY > 0 ? endY : -endY;
                let xMulti = event.deltaX * 0.03;
                let yMulti = event.deltaY / 80;
                let rotate = xMulti * yMulti;

                // event.target.style.transform = 'translate(' + toX + 'px, ' + (toY + event.deltaY) + 'px) rotate(' + rotate + 'deg)';

                moveOutWidth = document.body.clientWidth * 1.5;
                if (toX < 0) moveOutWidth *= -1;
                event.target.style.transform = 'translate(' + moveOutWidth + 'px, -100px) rotate(-30deg)';

                stopAllAudio();
                initCards();

                updateProgress()

                if (toX > 0) {
                    let songURI = el.getAttribute("song-uri");
                    addToPlaylist.push(songURI);
                }
                if (document.querySelectorAll('#add-new-tinder-cards-container .tinder--card:not(.removed)').length <= 1) {
                    sendAddRequest();
                }
            }
        });
    });

    function createButtonListener(love) {
        return function (event) {
            deleteLastRemovedCard();
            
            let cards = document.querySelectorAll('#add-new-tinder-cards-container .tinder--card:not(.removed)');
            let moveOutWidth = document.body.clientWidth * 1.5;

            if (cards.length <= 1) return false;

            let card = cards[1];
            card.classList.add('removed');

            if (love) {
                card.style.transform = 'translate(' + moveOutWidth + 'px, -100px) rotate(-30deg)';
                let songURI = card.getAttribute("song-uri");
                addToPlaylist.push(songURI);
            } else {
                card.style.transform = 'translate(-' + moveOutWidth + 'px, -100px) rotate(30deg)';
            }
            if (document.querySelectorAll('#add-new-tinder-cards-container .tinder--card:not(.removed)').length <= 1) {
                sendAddRequest();
            }

            stopAllAudio();
            initCards();

            updateProgress();

            event.preventDefault();
        };
    }
    document.getElementById('add-new-nope').onclick = createButtonListener(false);
    document.getElementById('add-new-love').onclick = createButtonListener(true);

    async function sendAddRequest() {
        document.getElementById("add-new-tinder").style.display = "none";
        document.getElementById("loading").style.display = "flex";

        stopAllAudio();

        if (addToPlaylist.length > 0) {
            let addedElements = 0;
            while (addedElements < addToPlaylist.length) {



                let data = await fetch(`https://api.spotify.com/v1/playlists/${getCurrentPlaylistId()}/tracks`, {
                    method: "POST",
                    headers: {
                        "Authorization": "Bearer " + getAccess_token(),
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        uris: addToPlaylist.slice(addedElements, addedElements + 100)
                    })
                });



                let json = await data.json();
                addedElements += 100;
            }
        }



        await loadPlaylists();
        document.getElementById("loading").style.display = "none";
        document.getElementById("content").style.display = "";

        let playlistName = document.getElementById("add-new-playlist-title").textContent;
        if (addToPlaylist.length > 0) createAlert(`Added ${addToPlaylist.length} Tracks to ${playlistName}.`, "success");
        else createAlert(`Added no tracks to ${playlistName}.`, "success");
    }

    function deleteLastRemovedCard() {
        let deletingChildren = document.querySelectorAll("#add-new-tinder-cards-container .tinder--card.removed");
        let container = document.querySelector("#add-new-tinder-cards-container");
        deletingChildren.forEach(child => {
            container.removeChild(child);
        });
    }

    function updateProgress() {
        let notRemovedCards = document.querySelectorAll('#add-new-tinder-cards-container .tinder--card:not(.removed)');
        document.getElementById("add-new-playlist-tracks").textContent = (tracks.length - notRemovedCards.length + 2) + " / " + tracks.length;
    }



    document.getElementById("loading").style.display = "none";
    document.getElementById("add-new-tinder").style.display = "";




    document.getElementById("add-new-cancel").onclick = async () => {
        stopAllAudio();
        document.getElementById("add-new-tinder").style.display = "none";
        document.getElementById("loading").style.display = "flex";
        await loadPlaylists();
        document.getElementById("loading").style.display = "none";
        document.getElementById("content").style.display = "";
    }
    document.getElementById("add-new-save").onclick = () => {
        sendAddRequest();
    }
}
module.exports = { addNewTinder };