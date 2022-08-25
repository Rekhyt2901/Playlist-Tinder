import { APIGet, loadPlaylists, createAlert } from "./functions.js";
import { getCurrentPlaylistId, getAccess_token } from "./main.js";




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
        return;
    }

    let tracks = [];
    for (let selectedPlaylistId of selectedPlaylistIds) {
        let fetchedPlaylist = await APIGet("playlists/" + selectedPlaylistId);
        let fetchedPlaylistTracks = fetchedPlaylist.tracks;
        
        tracks.push(...fetchedPlaylistTracks.items);
        while(fetchedPlaylistTracks.next) {
            fetchedPlaylistTracks = await APIGet(fetchedPlaylistTracks.next.split("v1/")[1]);
            tracks.push(...fetchedPlaylistTracks.items);
        }
    }
    if(checkedSavedSongs) {
        let savedSongs = await APIGet("me/tracks?limit=50");
        tracks.push(...savedSongs.items);
        while(savedSongs.next) {
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
        for(let i = 0; i < len; i++) {
             let item = a[i];
             if(!item.track) continue;
             if(seen[item.track.uri] !== 1) {
                   seen[item.track.uri] = 1;
                   out[j++] = item;
             }
        }
        return out;
    }
    tracks = uniq_fast(tracks);




    let addToPlaylist = [];
    

    // Set Playlist (at top)
    let playlist = await APIGet("playlists/" + getCurrentPlaylistId());
    let chosenPlaylistNode = document.getElementById("add-new-playlist");
    document.getElementById("add-new-playlist-title").textContent = playlist.name;

    document.getElementById("add-new-playlist-tracks").textContent = document.querySelectorAll('#add-new-tinder-cards-container .tinder--card.removed').length + 1 + " / " + tracks.length;

    let image = playlist.images.length > 0 ? playlist.images[0] : "none";
    if (image !== "none") chosenPlaylistNode.querySelector("img").setAttribute("src", image.url);





    // Remove old cards
    while (document.getElementById("add-new-tinder-cards-container").childElementCount > 1) {
        document.getElementById("add-new-tinder-cards-container").removeChild(document.getElementById("add-new-tinder-cards-container").lastChild);
    }

    for (let track of tracks) {
        let node = document.getElementById("add-new-tinder-card-template").cloneNode(true);
        node.style.display = "";
        node.setAttribute("id", "");

        if (track.track.album.images.length > 0) node.querySelector(".tinder-card-image").setAttribute("src", track.track.album.images[0].url);
        node.querySelector(".tinder-card-title").textContent = track.track.name;

        let artists = track.track.artists.reduce((a, c) => a + c.name + ", ", "");
        node.querySelector(".tinder-card-artists").textContent = artists.slice(0, -2);

        node.setAttribute("song-uri", track.track.uri);
        document.getElementById("add-new-tinder-cards-container").append(node);
    }

    // TINDER //
    let allCards = document.querySelectorAll('#add-new-tinder-cards-container .tinder--card');
    function initCards() {
        let newCards = document.querySelectorAll('#add-new-tinder-cards-container .tinder--card:not(.removed)');

        newCards.forEach(function (card, index) {
            card.style.zIndex = allCards.length - index;
            let scale = (20 - (index - 1)) / 20;
            if (scale < 0.1) scale = 0.1;
            card.style.transform = 'scale(' + scale + ') translateY(-' + 30 * (index - 1) + 'px)';
            card.style.opacity = (20 - (index - 1)) / 20;
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

            event.target.classList.toggle('removed', !keep);

            if (keep) {
                event.target.style.transform = '';
            } else {
                let endX = Math.max(Math.abs(event.velocityX) * moveOutWidth, moveOutWidth);
                let toX = event.deltaX > 0 ? endX : -endX;
                let endY = Math.abs(event.velocityY) * moveOutWidth;
                let toY = event.deltaY > 0 ? endY : -endY;
                let xMulti = event.deltaX * 0.03;
                let yMulti = event.deltaY / 80;
                let rotate = xMulti * yMulti;

                event.target.style.transform = 'translate(' + toX + 'px, ' + (toY + event.deltaY) + 'px) rotate(' + rotate + 'deg)';

                initCards();

                document.getElementById("add-new-playlist-tracks").textContent = document.querySelectorAll('#add-new-tinder-cards-container .tinder--card.removed').length + 1 + " / " + tracks.length;

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

            initCards();
            document.getElementById("add-new-playlist-tracks").textContent = document.querySelectorAll('#add-new-tinder-cards-container .tinder--card.removed').length + 1 + " / " + tracks.length;
            event.preventDefault();
        };
    }
    document.getElementById('add-new-nope').onclick = createButtonListener(false);
    document.getElementById('add-new-love').onclick = createButtonListener(true);

    async function sendAddRequest() {
        document.getElementById("add-new-tinder").style.display = "none";
        document.getElementById("loading").style.display = "flex";

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



    document.getElementById("loading").style.display = "none";
    document.getElementById("add-new-tinder").style.display = "";



    let offsetHeight = document.getElementById("content-container").clientHeight;
    let cardsHeight = document.querySelectorAll("#add-new-tinder-cards-container .tinder--card")[1];
    offsetHeight += cardsHeight ? cardsHeight.clientHeight : 0;
    document.getElementById("add-new-tinder--buttons").style.top = offsetHeight + "px";
}
module.exports = { addNewTinder };