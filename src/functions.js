import * as bootstrap from 'bootstrap';
import { getAccess_token, getDisplay_name } from "./main.js";


let baseURI = "https://api.spotify.com/v1/";

async function APIGet(endpoint) {
    let data = await fetch(baseURI + endpoint, {
        headers: {
            "Authorization": "Bearer " + getAccess_token()
        }
    });
    let json = await data.json();
    return json;
}

async function APIPost(endpoint, body) {
    let data = await fetch(baseURI + endpoint, {
        method: "POST",
        headers: {
            "Authorization": "Bearer " + getAccess_token(),
            "Content-Type": "application/json"
        },
        body: JSON.stringify(body)
    });
    let json = await data.json();
    return json;
}

function createAlert(message, color) {
    let alerts = document.getElementById("alerts-container");

    let alert = document.getElementById("alert-template").cloneNode(true);
    alert.setAttribute("id", "");
    alert.style.display = "";
    alert.querySelector(".alert-message").textContent = message;
    alert.classList.add("alert-" + color);


    let otherAlerts = document.querySelectorAll(".alert");
    for (let i = 0; i < otherAlerts.length; i++) {
        if (otherAlerts[i].style.display == "none") continue;
        let newTop = (parseInt(otherAlerts[i].style.top.split("px")[0]) + otherAlerts[i].offsetHeight + 12) + "px";
        otherAlerts[i].style.top = newTop;
    }
    alerts.prepend(alert);
    setTimeout(() => alert.style.top = "0px", 1);

    const alertInsatnce = bootstrap.Alert.getOrCreateInstance('#alerts-container .alert');
    setTimeout(() => {
        alert.style.opacity = "0";
        setTimeout(() => alertInsatnce.close(), 400);
    }, 5000);
}

async function loadPlaylists() {
    let playlists = [];
    let playlistsData = await APIGet("me/playlists");
    playlists = [...playlists, ...playlistsData.items];

    while (playlistsData.next) {
        playlistsData = await APIGet(playlistsData.next.split("v1/")[1]);
        playlists = [...playlists, ...playlistsData.items];
    }
    // console.log(playlists.map(n => { return { name: n.name, id: n.id } }))

    let template = document.getElementById("playlist-template");

    let playlistsContainer = document.getElementById("playlists");
    while (playlistsContainer.childElementCount > 2) playlistsContainer.removeChild(playlistsContainer.firstChild);
    let addPlaylistContainer = document.getElementById("add-playlist-container");
    if (addPlaylistContainer.classList.contains("d-none")) addPlaylistContainer.classList.remove("d-none");

    for (let i = 0; i < playlists.length; i++) {
        let playlist = playlists[i];

        if (playlist.owner.display_name !== getDisplay_name()) continue;

        let image = playlist.images.length > 0 ? playlist.images[0] : "none";
        let name = playlist.name;
        let id = playlist.id;
        let tracks = playlist.tracks.href;
        let numberOfTracks = playlist.tracks.total;


        let node = template.cloneNode(true);
        node.classList.remove("d-none");
        node.setAttribute("id", "");
        node.querySelector(".playlist-title").textContent = name;
        node.querySelector(".playlist-track-amount").textContent = numberOfTracks + " Tracks";
        if (image !== "none") node.querySelector("img").setAttribute("src", image.url);

        node.setAttribute("data-bs-playlist", id);

        document.getElementById("playlists").prepend(node);
    }
}



module.exports = {
    APIGet,
    APIPost,
    createAlert,
    loadPlaylists
};