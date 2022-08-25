import { APIGet, loadPlaylists, createAlert } from "./functions.js";
import { getCurrentPlaylistId, getAccess_token } from "./main.js";




async function manageCurrent() {
    let removeFromPlaylist = [];
    document.getElementById("content").style.display = "none";
    document.getElementById("loading").style.display = "flex";

    // Set Playlist (at top)
    let playlist = await APIGet("playlists/" + getCurrentPlaylistId());
    let chosenPlaylistNode = document.getElementById("manage-current-playlist");
    document.getElementById("manage-current-playlist-title").textContent = playlist.name;

    document.getElementById("manage-current-playlist-tracks").textContent = document.querySelectorAll('#tinder-cards-container .tinder--card.removed').length+1 + " / " + playlist.tracks.total;

    let image = playlist.images.length > 0 ? playlist.images[0] : "none";
    if (image !== "none") chosenPlaylistNode.querySelector("img").setAttribute("src", image.url);

    
    // Load all Songs from playlist
    let playlistTracks = playlist.tracks;
    
    // Returns on empty playlist
    if (playlistTracks.items.length == 0) {
        document.getElementById("manage-current-tinder").style.display = "none";
        document.getElementById("loading").style.display = "flex";
        await loadPlaylists();

        createAlert("Error, playlist is empty.", "danger");
        document.getElementById("content").style.display = "";
        document.getElementById("loading").style.display = "none";

        return;
    }

    let tracks = playlistTracks.items;
    while (playlistTracks.next) {
        playlistTracks = await APIGet(playlistTracks.next.split("v1/")[1]);
        tracks = [...tracks, ...playlistTracks.items];
    }


    // Remove old cards
    while(document.getElementById("tinder-cards-container").childElementCount > 1) {
        document.getElementById("tinder-cards-container").removeChild(document.getElementById("tinder-cards-container").lastChild);
    }

    for (let track of tracks) {
        let node = document.getElementById("tinder-card-template").cloneNode(true);
        node.style.display = "";
        node.setAttribute("id", "");

        if(!track.track) continue;
        if (track.track.album.images.length > 0) node.querySelector(".tinder-card-image").setAttribute("src", track.track.album.images[0].url);
        node.querySelector(".tinder-card-title").textContent = track.track.name;

        let artists = track.track.artists.reduce((a, c) => a + c.name + ", ", "");
        node.querySelector(".tinder-card-artists").textContent = artists.slice(0, -2);

        node.setAttribute("song-uri", track.track.uri);
        document.getElementById("tinder-cards-container").append(node);
    }

    // TINDER //
    let allCards = document.querySelectorAll('#tinder-cards-container .tinder--card');
    function initCards() {
        let newCards = document.querySelectorAll('#tinder-cards-container .tinder--card:not(.removed)');

        newCards.forEach(function (card, index) {
            card.style.zIndex = allCards.length - index;
            let scale = (20 - (index - 1)) / 20;
            if (scale < 0.1) scale = 0.1;
            card.style.transform = 'scale(' + scale + ') translateY(-' + 30 * (index - 1) + 'px)';
            card.style.opacity = (20 - (index - 1)) / 20;
        });

        document.getElementById("manage-current-tinder-container").classList.add('loaded');
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
                
                document.getElementById("manage-current-playlist-tracks").textContent = document.querySelectorAll('#tinder-cards-container .tinder--card.removed').length+1 + " / " + playlist.tracks.total;

                if (toX < 0) {
                    let songURI = el.getAttribute("song-uri");
                    removeFromPlaylist.push({ "uri": songURI });
                }
                if (document.querySelectorAll('#tinder-cards-container .tinder--card:not(.removed)').length <= 1) {
                    sendRemoveRequest();
                }
            }
        });
    });

    function createButtonListener(love) {
        return function (event) {
            let cards = document.querySelectorAll('#tinder-cards-container .tinder--card:not(.removed)');
            let moveOutWidth = document.body.clientWidth * 1.5;

            if (cards.length <= 1) return false;

            let card = cards[1];
            card.classList.add('removed');

            if (love) {
                card.style.transform = 'translate(' + moveOutWidth + 'px, -100px) rotate(-30deg)';
            } else {
                let songURI = card.getAttribute("song-uri");
                removeFromPlaylist.push({ "uri": songURI });
                card.style.transform = 'translate(-' + moveOutWidth + 'px, -100px) rotate(30deg)';
            }
            if (document.querySelectorAll('#tinder-cards-container .tinder--card:not(.removed)').length <= 1) {
                sendRemoveRequest();
            }

            initCards();
            document.getElementById("manage-current-playlist-tracks").textContent = document.querySelectorAll('#tinder-cards-container .tinder--card.removed').length+1 + " / " + playlist.tracks.total;
            event.preventDefault();
        };
    }
    document.getElementById('nope').onclick = createButtonListener(false);
    document.getElementById('love').onclick = createButtonListener(true);

    async function sendRemoveRequest() {
        document.getElementById("manage-current-tinder").style.display = "none";
        document.getElementById("loading").style.display = "flex";

        if(removeFromPlaylist.length > 0) {
            let deletedElements = 0;
            while(deletedElements < removeFromPlaylist.length) {
                let data = await fetch(`https://api.spotify.com/v1/playlists/${getCurrentPlaylistId()}/tracks`, {
                    method: "DELETE",
                    headers: {
                        "Authorization": "Bearer " + getAccess_token(),
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        tracks: removeFromPlaylist.slice(deletedElements, deletedElements + 100)
                    })
                });
                let json = await data.json();
                deletedElements += 100;
            }
        }



        await loadPlaylists();
        document.getElementById("loading").style.display = "none";
        document.getElementById("content").style.display = "";

        let playlistName = document.getElementById("manage-current-playlist-title").textContent;
        if(removeFromPlaylist.length > 0) createAlert(`Removed ${removeFromPlaylist.length} Tracks from ${playlistName}.`, "success");
        else createAlert(`Kept all tracks in ${playlistName}.`, "success");
    }



    document.getElementById("loading").style.display = "none";
    document.getElementById("manage-current-tinder").style.display = "";



    let offsetHeight = document.getElementById("content-container").clientHeight;
    let cardsHeight = document.querySelectorAll("#tinder-cards-container .tinder--card")[1];
    offsetHeight += cardsHeight ? cardsHeight.clientHeight : 0;
    document.getElementById("tinder--buttons").style.top = offsetHeight + "px";
}
module.exports = { manageCurrent };