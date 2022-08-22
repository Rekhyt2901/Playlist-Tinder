import * as bootstrap from 'bootstrap';

let access_token;
let refresh_token;
let baseURI = "https://api.spotify.com/v1/";

async function init() {
    // document.getElementById('obtain-new-token').onclick = obtainNewToken;
    async function obtainNewToken() {
        let x = await fetch(`http://localhost:3002/refresh_token?refresh_token=${refresh_token}`);
        let data = await x.json();
        access_token = data.access_token;
        history.replaceState('', 'Playlist Tinder', '/?access_token=' + access_token + "&refresh_token=" + refresh_token);
        console.log("New Token:", access_token);
        setTimeout(obtainNewToken, 3500000);
    }

    function getHashParams() {
        let hashParams = {};
        let e;
        let r = /([^&;=]+)=?([^&;]*)/g
        let q = window.location.hash.substring(1);
        while (e = r.exec(q)) {
            hashParams[e[1]] = decodeURIComponent(e[2]);
        }
        return hashParams;
    }
    let params = Object.fromEntries(new URLSearchParams(location.search.substring(1)));

    access_token = params.access_token;
    refresh_token = params.refresh_token;
    // console.log("Token:", access_token);
    let error = params.error;
    if (error) {
        alert('There was an error during the authentication');
    } else {
        if (access_token) {
            let x = await fetch("https://api.spotify.com/v1/me", {
                method: "GET",
                headers: {
                    'Authorization': 'Bearer ' + access_token
                },
            });
            let data = await x.json();
            // console.log("data:", data);

            document.getElementById('login').style.display = "none";
            document.getElementById("loggedin").style.display = "none";
            document.getElementById("content").style.display = "";

            setTimeout(obtainNewToken, 3500000);
            main();
        } else {
            // render initial screen
            document.getElementById('login').style.display = "";
            document.getElementById('loggedin').style.display = "none";
            document.getElementById("content").style.display = "none";
        }
    }
}
init();

async function main() {
    let profile = await APIGet("me");

    document.getElementById("profile-picture").setAttribute("src", profile.images[0] ? profile.images[0].url : "./default-avatar.png");
    document.getElementById("profile-name").textContent = profile.display_name;



    let playlists = await APIGet("me/playlists");
    console.log(playlists.items[1]);
    let template = document.getElementById("playlist-template");

    for (let i = 0; i < playlists.items.length; i++) {
        let playlist = playlists.items[i];
        let image = playlist.images.length > 0 ? playlist.images[0] : "none";
        let name = playlist.name;
        let id = playlist.id;
        if (playlist.primary_color) console.log("Primary Color:", playlist.primary_color);
        let tracks = playlist.tracks.href;
        let numberOfTracks = playlist.tracks.total;


        let node = template.cloneNode(true);
        node.classList.remove("d-none");
        node.querySelector(".playlist-title").textContent = name;
        node.querySelector(".playlist-track-amount").textContent = numberOfTracks + " Tracks";
        if (image != "none") node.querySelector("img").setAttribute("src", image.url);

        node.setAttribute("data-bs-playlist", id);



        document.getElementById("playlists").prepend(node);
    }


    const playlistModal = document.getElementById('playlist-modal')
    playlistModal.addEventListener('show.bs.modal', event => {
        // Button that triggered the modal
        const button = event.relatedTarget;
        // Extract info from data-bs-* attributes
        const playlistId = button.getAttribute('data-bs-playlist')
        // If necessary, you could initiate an AJAX request here
        // and then do the updating in a callback.
        //
        // Update the modal's content.
        const modalBody = playlistModal.querySelector('.modal-playlist-id')

        modalBody.textContent = playlistId;
    })
}

async function APIGet(endpoint) {
    let data = await fetch(baseURI + endpoint, {
        headers: {
            "Authorization": "Bearer " + access_token,
        }
    });
    let json = await data.json();
    return json;
}