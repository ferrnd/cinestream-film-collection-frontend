// Código com Inteligência Artificial para salvar perfis localmente e permitir imagens personalizadas.

document.addEventListener('DOMContentLoaded', () => {
  const avatarInput = document.getElementById('avatarInput');
  const avatarPreview = document.getElementById('avatarPreview');
  const saveBtn = document.getElementById('saveBtn');
  const nameInput = document.getElementById('profileName');

  function handleAvatarChange(input, preview) {
    if (!input || !preview) return;
    const file = input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      preview.src = reader.result;
      preview.dataset.selected = '1';
    };
    reader.readAsDataURL(file);
  }

  if (avatarInput) {
    avatarInput.addEventListener('change', () => handleAvatarChange(avatarInput, avatarPreview));
  }

  if (!saveBtn) return;

  saveBtn.addEventListener('click', (e) => {
    e.preventDefault();
    const name = nameInput ? nameInput.value.trim() : '';
    if (!name) {
      alert('Digite um nome para o perfil.');
      return;
    }

    // Create profile flow (from pages/createprofile.html)
    const avatarSrc = (avatarPreview && avatarPreview.src) ? avatarPreview.src : '../assets/images/defaultuser.jpeg';

    let profiles = JSON.parse(localStorage.getItem('profiles')) || [];
    profiles.push({ name: name, avatar: avatarSrc });
    localStorage.setItem('profiles', JSON.stringify(profiles));

    // Redirect to perfis. If current page is inside /pages/, use relative path 'perfis.html'
    const path = window.location.pathname || '';
    if (path.includes('/pages/') || path.endsWith('/createprofile.html')) {
      window.location.href = 'perfis.html';
    } else {
      window.location.href = 'pages/perfis.html';
    }
  });
});