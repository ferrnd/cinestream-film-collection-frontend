// Código com Inteligência Artificial para salvar perfis localmente e permitir imagens personalizadas.

function loadProfiles() {
    let profiles = JSON.parse(localStorage.getItem("profiles")) || [];
    const list = document.getElementById("profileList");
    list.innerHTML = "";

    profiles.forEach((p, index) => {
        list.innerHTML += `
            <div class="profile">
                <img src="${p.avatar}" alt="${p.name}" onclick="openProfile(${index})">
                <span>${p.name}</span>
                <button class="delete-btn" onclick="deleteProfile(${index})">✖</button>
            </div>
        `;
    });

    list.innerHTML += `
        <div class="profile">
            <a href="createprofile.html">
                <img src="../assets/images/newprofile.png" alt="Adicionar perfil">
            </a>
            <span>Adicionar Perfil</span>
        </div>
    `;
}

function openProfile(i) {
    window.location.href = "home.html";
}

function deleteProfile(i) {
    if (!confirm("Deseja realmente excluir este perfil?")) return;
    let profiles = JSON.parse(localStorage.getItem("profiles")) || [];
    profiles.splice(i, 1);
    localStorage.setItem("profiles", JSON.stringify(profiles));
    loadProfiles();
}

loadProfiles();
