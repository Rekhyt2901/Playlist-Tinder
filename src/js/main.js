import * as bootstrap from 'bootstrap';
import { APIGet, APIPost, createAlert, loadPlaylists } from "./functions.js";
import { manageCurrent } from "./manage-current.js";
import { addNew, cancelAddNew } from "./add-new.js";
import { addNewTinder } from "./add-new-tinder.js";


let access_token;
let refresh_token;
let expires;

let userId = "";
let display_name = "";
let currentPlaylistId;

export function getAccess_token() { return access_token }
export function getDisplay_name() { return display_name }
export function getCurrentPlaylistId() { return currentPlaylistId }

window.onload = init;

async function init() {
    async function obtainNewToken() {
        let x = await fetch(`https://spotify-tinder.alexkleyn.de:3002/refresh_token?refresh_token=${refresh_token}`);
        let data = await x.json();
        access_token = data.access_token;
        let expires = Date.now() + 3600000;
        history.replaceState('', 'Playlist Tinder', '/?access_token=' + access_token + "&refresh_token=" + refresh_token + "&expires=" + expires);
        console.log("New Token:", access_token);
        setTimeout(obtainNewToken, 3500000);
    }

    let params = Object.fromEntries(new URLSearchParams(location.search.substring(1)));

    access_token = params.access_token;
    refresh_token = params.refresh_token;
    expires = params.expires;

    let error = params.error;
    if (error) {
        alert('There was an error during the authentication');
    } else {
        if (access_token && refresh_token && expires) {
            document.getElementById('login').style.display = "none";
            document.getElementById("logout").style.display = "";
            // document.getElementById("content").style.display = "";
            // document.getElementById("loading").style.display = "none";

            setTimeout(obtainNewToken, expires - Date.now() - 100000);
            main();
        } else {
            // render initial screen
            document.getElementById('login').style.display = "flex";
            document.getElementById("content").style.display = "none";
            document.getElementById("loading").style.display = "none";
        }
    }
}

async function main() {

    let profile = await APIGet("me");

    document.getElementById("profile-picture").setAttribute("src", profile.images[0] ? profile.images[0].url : "./images/default-avatar.png");
    document.getElementById("profile-picture").style.display = "";
    document.getElementById("profile-name").textContent = profile.display_name;
    userId = profile.id;
    display_name = profile.display_name;

    await loadPlaylists();
    document.getElementById("loading").style.display = "none";
    document.getElementById("content").style.display = "";




    document.getElementById("manage-current").onclick = manageCurrent;

    document.getElementById("add-new").onclick = addNew;
    document.getElementById("cancel-choose-playlists").onclick = cancelAddNew;
    document.getElementById("next-choose-playlists").onclick = addNewTinder;


    const playlistModal = document.getElementById('playlist-modal');
    playlistModal.addEventListener('show.bs.modal', event => {
        // Button that triggered the modal
        const button = event.relatedTarget;

        const playlistId = button.getAttribute('data-bs-playlist');
        currentPlaylistId = playlistId;
    });

    const addPlaylistModal = new bootstrap.Modal("#add-playlist-modal");
    document.getElementById("save-new-playlist").onclick = async () => {
        let name = document.getElementById("playlist-name").value;
        if (!name) {
            createAlert("Please enter a name first.", "danger");
            return;
        }

        let options = {
            name: name,
            description: "",
            public: false
        }

        let data = await APIPost(`users/${userId}/playlists`, options);
        loadPlaylists();
        document.getElementById("playlist-name").value = "";
        addPlaylistModal.hide();
    }
}






