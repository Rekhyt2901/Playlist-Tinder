import { APIGet, loadPlaylists } from "./functions.js";
import { getDisplay_name, getCurrentPlaylistId } from "./main.js";



async function addNew() {
    document.getElementById("content").style.display = "none";
    document.getElementById("loading").style.display = "flex";

    let playlists = [];
    let playlistsData = await APIGet("me/playlists");
    playlists = [...playlists, ...playlistsData.items];
    while (playlistsData.next) {
        playlistsData = await APIGet(playlistsData.next.split("v1/")[1]);
        playlists = [...playlists, ...playlistsData.items];
    }

    let savedSongs = await APIGet("me/tracks");
    let chosenPlaylistTemplate = document.getElementById("choose-playlist-template");
    chosenPlaylistTemplate.querySelector(".choose-playlist-track-amount").textContent = (savedSongs.total + savedSongs.items.length) + " Tracks";
    let toggleSavedCheckbox = () => {
        let nodeInput = chosenPlaylistTemplate.querySelector("input");
        let nodeChecked = Boolean(nodeInput.checked);
        nodeInput.checked = !nodeChecked;
    }
    chosenPlaylistTemplate.querySelector("label").onclick = toggleSavedCheckbox;
    chosenPlaylistTemplate.querySelector("span").onclick = toggleSavedCheckbox;

    while(document.getElementById("choose-playlists-container").childElementCount > 1) {
        document.getElementById("choose-playlists-container").removeChild(document.getElementById("choose-playlists-container").lastChild);
    }

    for (let playlist of playlists) {
        if (playlist.owner.display_name !== getDisplay_name()) continue;

        // Set Playlist (at top)
        if (playlist.id == getCurrentPlaylistId()) {
            let chosenPlaylistNode = document.getElementById("chosen-playlist");
            chosenPlaylistNode.querySelector(".playlist-title").textContent = playlist.name;
            chosenPlaylistNode.querySelector(".playlist-track-amount").textContent = playlist.tracks.total + " Tracks";

            let image = playlist.images.length > 0 ? playlist.images[0] : "none";
            if (image !== "none") chosenPlaylistNode.querySelector("img").setAttribute("src", image.url);
            continue;
        }

        let node = chosenPlaylistTemplate.cloneNode(true);
        node.setAttribute("id", "")
        node.querySelector(".form-check-label").textContent = playlist.name;
        node.querySelector(".choose-playlist-track-amount").textContent = " " + playlist.tracks.total + " Tracks";
        node.querySelector(".form-check-input").setAttribute("playlistId", playlist.id);

        let toggleCheckbox = () => {
            let nodeInput = node.querySelector("input");
            let nodeChecked = Boolean(nodeInput.checked);
            nodeInput.checked = !nodeChecked;
        }
        node.querySelector("label").onclick = toggleCheckbox;
        node.querySelector("span").onclick = toggleCheckbox;

        document.getElementById("choose-playlists-container").appendChild(node);
    }

    document.getElementById("loading").style.display = "none"
    document.getElementById("choose-playlists").style.display = "";
}

async function cancelAddNew() {
    document.getElementById("choose-playlists").style.display = "none";
    document.getElementById("loading").style.display = "flex";

    await loadPlaylists();

    document.getElementById("loading").style.display = "none";
    document.getElementById("content").style.display = "";
}

module.exports = { addNew, cancelAddNew };