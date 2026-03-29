// =============================
// INITIALIZE ON PAGE LOAD
// =============================
window.addEventListener('load', async function() {
  await loadData();
  // Attendre un petit peu pour que les données soient chargées
  setTimeout(() => {
    showDepart();
  }, 500);
});

// =============================
// TOGGLE SIDEBAR
// =============================
function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  if (sidebar) {
    sidebar.classList.toggle('collapsed');
  }
}

const API_URL = "https://script.google.com/macros/s/AKfycbysuA2KIeL1vQ2N5dQ17o5ai6ayElOkIE7NlAUNDTDp2-V_zNwYpzNeL6WP4vlmPvIC/exec";


let employes = [];
let motifsDepart = [

  "Congé de maternité",
  "Abandon de poste",
  "Abandon de formation","Arrêt de contrat","Décès","Fin de période d'essai","Mobilité intra groupe",
  "Démission",
  "Licenciement",
  "Fin de projet",
  "Fin de campagne"
];
let motifsMouvement = [];
let dataLoaded = false;
let isSubmitting = false; // Flag pour éviter les envois multiples

// =============================
// LOAD DATA (POST ONLY)
// =============================
function loadData() {
  const formData = new FormData();
  formData.append("type", "getData");

  fetch(API_URL, {
    method: "POST",
    body: formData,
    timeout: 10000 // Timeout de 10 secondes
  })
    .then(res => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    })
    .then(data => {
      if (data.status === "success") {
        employes = data.employes;
        // Garder les motifs par défaut définis
        // (Ne pas écraser avec les données de l'API)
        dataLoaded = true;
        console.log("✅ Données chargées :", employes.length, "employés");
      } else {
        throw new Error(data.message || "Erreur serveur");
      }
    })
    .catch(err => {
      console.error("❌ Erreur chargement :", err.message);
      dataLoaded = false;
    });
}

// =============================
// ATTENDRE LES DONNÉES CHARGÉES
// =============================
function waitForData() {
  return new Promise((resolve) => {
    if (dataLoaded) {
      resolve();
    } else {
      console.warn("⏳ Données pas encore chargées, attente...");
      const check = setInterval(() => {
        if (dataLoaded) {
          clearInterval(check);
          resolve();
        }
      }, 100); // Vérifier tous les 100ms
      
      // Timeout après 5 secondes
      setTimeout(() => {
        clearInterval(check);
        if (!dataLoaded) {
          console.error("❌ Timeout : données non chargées");
          resolve(); // Continuer même sans données
        }
      }, 5000);
    }
  });
}

// =============================
// SHOW DEPART FORM
// =============================
async function showDepart() {
  // Attendre que les données soient chargées
  await waitForData();
  
  // Vérifier si les données sont disponibles
  if (employes.length === 0) {
    console.error("❌ Pas de données disponibles");
    document.getElementById("formContainer").innerHTML = `
      <div style="text-align: center; color: #dc3545; padding: 30px;">
        <h3>⚠️ Erreur de chargement</h3>
        <p>Les données n'ont pas pu être chargées.</p>
        <button onclick="loadData(); setTimeout(() => showDepart(), 1000)">🔄 Réessayer</button>
      </div>
    `;
    return;
  }
  
  // Ajouter classe active au bouton Départ
  setActiveButton('depart');
  
  const optionsEmployes = employes
    .map(emp => `<option value="${emp.matricule}|${emp.nom}|${emp.fonction}">${emp.matricule} - ${emp.nom}</option>`)
    .join("");

  const optionsMotif = motifsDepart
    .map(motif => `<option value="${motif}">${motif}</option>`)
    .join("");

  document.getElementById("formContainer").innerHTML = `
    <form onsubmit="submitDepart(event)">
      <h3>📤 Formulaire de Départ</h3>
      
      <label for="hrbp">HRBP :</label>
      <select id="hrbp" required>
        <option value="">-- Choisir un HRBP --</option>
        <option value="Malala">Malala</option>
        <option value="Ravo">Ravo</option>
        <option value="Koloina">Koloina</option>
        <option value="Lanto">Lanto</option>
        <option value="Carine">Carine</option>
        <option value="Chrissie">Chrissie</option>
        <option value="Mamonjisoa">Mamonjisoa</option>
      </select><br>

      <label>Sélectionner Employé :</label>
      <div class="search-container">
        <input type="text" id="employeeSearch" class="search-input" placeholder="🔍 Rechercher par matricule ou nom..." onkeyup="filterEmployeeList('depart')">
        <div id="employeeDropdown" class="employee-dropdown">
          ${employes.map(emp => `<div class="employee-option" onclick="selectEmployee('depart', '${emp.matricule}|${emp.nom}|${emp.fonction}')">${emp.matricule} - ${emp.nom}</div>`).join('')}
        </div>
      </div><br>

      <label for="matricule">Matricule :</label>
      <input id="matricule" readonly><br>

      <label for="nom">Nom et Prénoms :</label>
      <input id="nom" readonly><br>

      <label for="fonction">Fonction :</label>
      <input id="fonction" readonly><br>

      <label for="dateDepart">Date de Départ :</label>
      <input type="date" id="dateDepart" required><br>

      <label for="motif">Motif de Départ :</label>
      <select id="motif" required onchange="validateRaisonDepart()">
        <option value="">-- Choisir un motif --</option>
        ${optionsMotif}
      </select><br>

      <label for="raison">Raison <span style="color: red;">*</span></label>
      <textarea id="raison" placeholder="Détails de la raison" onchange="validateRaisonDepart()"></textarea>
      <div id="raisonMsg" style="font-size: 12px; color: #666; margin-top: 5px;">* Obligatoire pour Démission et Licenciement</div>

      <br><button type="submit">📝 Envoyer</button>
    </form>
  `;
  
  // Stocker les employés pour le filtrage
  window.employeesDepartList = employes;
}

// =============================
// FILTER EMPLOYEE LIST
// =============================
function filterEmployeeList(formType) {
  const searchInput = document.getElementById('employeeSearch');
  const dropdown = document.getElementById('employeeDropdown');
  const searchTerm = searchInput.value.toLowerCase();
  
  const employeeList = formType === 'depart' ? window.employeesDepartList : window.employeesMouvementList;
  
  if (searchTerm === '') {
    // Afficher tous les employés si le champ est vide
    dropdown.innerHTML = employeeList
      .map(emp => `<div class="employee-option" onclick="selectEmployee('${formType}', '${emp.matricule}|${emp.nom}|${emp.fonction}')">${emp.matricule} - ${emp.nom}</div>`)
      .join('');
  } else {
    // Filtrer les employés
    const filtered = employeeList.filter(emp => 
      emp.matricule.toLowerCase().includes(searchTerm) || 
      emp.nom.toLowerCase().includes(searchTerm)
    );
    
    if (filtered.length === 0) {
      dropdown.innerHTML = '<div style="padding: 10px; color: #999;">Aucun employé trouvé</div>';
    } else {
      dropdown.innerHTML = filtered
        .map(emp => `<div class="employee-option" onclick="selectEmployee('${formType}', '${emp.matricule}|${emp.nom}|${emp.fonction}')">${emp.matricule} - ${emp.nom}</div>`)
        .join('');
    }
  }
  
  dropdown.style.display = 'block';
}

// =============================
// SELECT EMPLOYEE
// =============================
function selectEmployee(formType, employeeData) {
  const [matricule, nom, fonction] = employeeData.split("|");
  
  // Remplir les champs
  document.getElementById("matricule").value = matricule;
  document.getElementById("nom").value = nom;
  
  // Remplir le champ approprié selon le type de formulaire
  if (formType === 'depart') {
    document.getElementById("fonction").value = fonction;
  } else if (formType === 'mouvement') {
    document.getElementById("ancienPoste").value = fonction;
    fillMouvementNewPositions();
  }
  
  // Vider la recherche et fermer le dropdown
  document.getElementById('employeeSearch').value = '';
  document.getElementById('employeeDropdown').style.display = 'none';
}

// =============================
// SHOW MOUVEMENT FORM
// =============================
async function showMouvement() {
  // Attendre que les données soient chargées
  await waitForData();
  
  // Vérifier si les données sont disponibles
  if (employes.length === 0) {
    console.error("❌ Pas de données disponibles");
    document.getElementById("formContainer").innerHTML = `
      <div style="text-align: center; color: #dc3545; padding: 30px;">
        <h3>⚠️ Erreur de chargement</h3>
        <p>Les données n'ont pas pu être chargées.</p>
        <button onclick="loadData(); setTimeout(() => showMouvement(), 1000)">🔄 Réessayer</button>
      </div>
    `;
    return;
  }
  
  // Ajouter classe active au bouton Mouvement
  setActiveButton('mouvement');
  
  const optionsTypeMvt = motifsMouvement
    .map(motif => `<option value="${motif}">${motif}</option>`)
    .join("");

  // Créer les options de fonction (toutes d'abord, elles seront filtrées au changement)
  const allFonctions = employes
    .filter((emp, index, self) => self.findIndex(e => e.fonction === emp.fonction) === index)
    .map(emp => emp.fonction);

  document.getElementById("formContainer").innerHTML = `
    <form onsubmit="submitMouvement(event)">
      <h3>🔄 Formulaire de Mouvement</h3>

      <label for="hrbp">HRBP :</label>
      <select id="hrbp" required>
        <option value="">-- Choisir un HRBP --</option>
        <option value="Malala">Malala</option>
        <option value="Ravo">Ravo</option>
        <option value="Koloina">Koloina</option>
        <option value="Lanto">Lanto</option>
        <option value="Carine">Carine</option>
        <option value="Chrissie">Chrissie</option>
        <option value="Mamonjisoa">Mamonjisoa</option>
      </select><br>

      <label>Sélectionner Employé :</label>
      <div class="search-container">
        <input type="text" id="employeeSearch" class="search-input" placeholder="🔍 Rechercher par matricule ou nom..." onkeyup="filterEmployeeList('mouvement')">
        <div id="employeeDropdown" class="employee-dropdown">
          ${employes.map(emp => `<div class="employee-option" onclick="selectEmployee('mouvement', '${emp.matricule}|${emp.nom}|${emp.fonction}')">${emp.matricule} - ${emp.nom}</div>`).join('')}
        </div>
      </div><br>

      <label for="matricule">Matricule :</label>
      <input id="matricule" readonly><br>

      <label for="nom">Nom et Prénoms :</label>
      <input id="nom" readonly><br>

      <label for="ancienPoste">Ancien Poste :</label>
      <input id="ancienPoste" readonly><br>

      <label for="dateMvt">Date du Mouvement :</label>
      <input type="date" id="dateMvt" required><br>

      <label for="typeMvt">Type de Mouvement :</label>
      <select id="typeMvt" required onchange="handleTypeChangement()">
        <option value="">-- Choisir un type --</option>
        <option value="Basculement CDI">Basculement CDI</option>
        <option value="Basculement CDD">Basculement CDD</option>
        <option value="Changement d'intitulé">Changement d'intitulé</option>
        <option value="Nomination au poste">Nomination au poste</option>
        <option value="Mutation">Mutation</option>
        <option value="Basculement vers une autre poste">Basculement vers une autre poste</option>
      </select><br>

      <div id="nouvelleFonctionPersonnaliseeDiv" style="display: none;">
        <label for="nouvelleFonctionPersonnalisee">Nouvelle Fonction Personnalisée :</label>
        <input type="text" id="nouvelleFonctionPersonnalisee" placeholder="Entrez la nouvelle fonction..." style="margin-bottom: 10px;"><br>
      </div>

      <div id="selectNouveauPosteDiv">
        <label for="nouveauPoste">Nouvelle Fonction :</label>
        <select id="nouveauPoste" required>
          <option value="">-- Choisir une fonction --</option>
        </select><br>
        
        <div style="display: flex; align-items: center; margin-top: 10px;">
          <input type="checkbox" id="isFonctionNouvelle" style="width: auto; margin: 0 10px 0 0; cursor: pointer;" onchange="handleFonctionNouvelle()">
          <label for="isFonctionNouvelle" style="margin: 0; cursor: pointer;">✨ C'est une nouvelle fonction</label>
        </div><br>
        
        <div id="nouvelleFonctionInputDiv" style="display: none;">
          <label for="nouvelleFonctionNom">Entrez le nom de la nouvelle fonction :</label>
          <input type="text" id="nouvelleFonctionNom" placeholder="Entrez nouvelle fonction..." style="margin-bottom: 10px;"><br>
        </div>
      </div>

      <label for="raisonMvt">Raison du Mouvement :</label>
      <textarea id="raisonMvt" placeholder="Détails de la raison"></textarea><br>
        <br>
      <button type="submit">📝 Envoyer</button>
    </form>
  `;

  // Stocker les employés et fonctions pour utilisation dans le filtrage
  window.employeesMouvementList = employes;
  window.allFonctions = allFonctions;
}

// =============================
// HANDLE FONCTION NOUVELLE
// =============================
function handleFonctionNouvelle() {
  const checkbox = document.getElementById('isFonctionNouvelle');
  const inputDiv = document.getElementById('nouvelleFonctionInputDiv');
  const inputField = document.getElementById('nouvelleFonctionNom');
  const selectNouveauPoste = document.getElementById('nouveauPoste');
  
  if (checkbox.checked) {
    // Afficher la zone texte
    inputDiv.style.display = 'block';
    inputField.required = true;
    selectNouveauPoste.required = false;
    selectNouveauPoste.value = '';
  } else {
    // Cacher la zone texte
    inputDiv.style.display = 'none';
    inputField.required = false;
    inputField.value = '';
    selectNouveauPoste.required = true;
  }
}

// =============================
// HANDLE TYPE CHANGEMENT
// =============================
function handleTypeChangement() {
  const typeMvt = document.getElementById('typeMvt').value;
  const nouvelleFonctionPersonnaliseeDiv = document.getElementById('nouvelleFonctionPersonnaliseeDiv');
  const selectNouveauPosteDiv = document.getElementById('selectNouveauPosteDiv');
  const nouvelleFonctionPersonnalisee = document.getElementById('nouvelleFonctionPersonnalisee');
  const nouveauPoste = document.getElementById('nouveauPoste');
  const checkboxDiv = selectNouveauPosteDiv.querySelector('div[style*="flex"]');
  
  if (typeMvt === "Changement d'intitulé") {
    // Afficher le champ personnalisé et cacher le select
    nouvelleFonctionPersonnaliseeDiv.style.display = 'block';
    selectNouveauPosteDiv.style.display = 'none';
    nouvelleFonctionPersonnalisee.required = true;
    nouveauPoste.required = false;
  } else {
    // Afficher le select et cacher le champ personnalisé
    nouvelleFonctionPersonnaliseeDiv.style.display = 'none';
    selectNouveauPosteDiv.style.display = 'block';
    nouvelleFonctionPersonnalisee.required = false;
    nouveauPoste.required = true;
  }
}

// =============================
// FILL MOUVEMENT NEW POSITIONS
// =============================
function fillMouvementNewPositions() {
  const ancienPoste = document.getElementById("ancienPoste").value;
  
  // Mettre à jour les options du dropdown "nouveauPoste" en excluant l'ancienPoste
  const nouveauPosteSelect = document.getElementById("nouveauPoste");
  if (nouveauPosteSelect) {
    nouveauPosteSelect.innerHTML = '<option value="">-- Choisir une fonction --</option>';
    
    if (window.allFonctions) {
      window.allFonctions.forEach(fonction_item => {
        // Exclure la fonction actuelle (ancien poste)
        if (fonction_item !== ancienPoste) {
          const option = document.createElement("option");
          option.value = fonction_item;
          option.text = fonction_item;
          nouveauPosteSelect.appendChild(option);
        }
      });
    }
  }
}

// =============================
// VALIDATE RAISON DEPART
// =============================
function validateRaisonDepart() {
  const motif = document.getElementById('motif').value;
  const raison = document.getElementById('raison').value.trim();
  const raisonField = document.getElementById('raison');
  const raisonMsg = document.getElementById('raisonMsg');

  // Vérifier que l'élément existe avant d'y accéder
  if (!raisonMsg) return;

  if ((motif === "Démission" || motif === "Licenciement")) {
    // Si motif est Démission ou Licenciement, raison est OBLIGATOIRE
    if (raison === "") {
      raisonField.classList.add('required-field-error');
      raisonMsg.style.color = '#dc3545';
      raisonMsg.textContent = '⚠️ Obligatoire pour Démission et Licenciement';
    } else {
      raisonField.classList.remove('required-field-error');
      raisonMsg.style.color = '#666';
      raisonMsg.textContent = '* Obligatoire pour Démission et Licenciement';
    }
  } else {
    // Pour les autres motifs, raison n'est pas obligatoire
    raisonField.classList.remove('required-field-error');
    raisonMsg.style.color = '#666';
    raisonMsg.textContent = '* Obligatoire pour Démission et Licenciement';
  }
}

// =============================
// SUBMIT DEPART (AVEC RECAP)
// =============================
function submitDepart(e) {
  e.preventDefault();

  const motif = document.getElementById('motif').value;
  const raison = document.getElementById('raison').value.trim();
  const raisonField = document.getElementById('raison');

  // Validation : si Démission ou Licenciement, raison obligatoire
  if ((motif === "Démission" || motif === "Licenciement") && raison === "") {
    raisonField.classList.add('required-field-error');
    document.getElementById('raisonMsg').style.color = '#dc3545';
    return;
  }

  showRecapDepart();
}

function showRecapDepart() {
  const hrbp = document.getElementById('hrbp').value;
  const matricule = document.getElementById('matricule').value;
  const nom = document.getElementById('nom').value;
  const fonction = document.getElementById('fonction').value;
  const dateDepart = document.getElementById('dateDepart').value;
  const motif = document.getElementById('motif').value;
  const raison = document.getElementById('raison').value;

  const modal = `
    <div class="modal-overlay">
      <div class="modal-content">
        
        <div class="recap-section">
          <div class="recap-row">
            <span class="recap-label">👤 HRBP :</span>
            <span class="recap-value">${hrbp}</span>
          </div>
          <div class="recap-row">
            <span class="recap-label">🔢 Matricule :</span>
            <span class="recap-value">${matricule}</span>
          </div>
          <div class="recap-row">
            <span class="recap-label">👨‍💼 Nom et Prénoms :</span>
            <span class="recap-value">${nom}</span>
          </div>
          <div class="recap-row">
            <span class="recap-label">💼 Fonction :</span>
            <span class="recap-value">${fonction}</span>
          </div>
          <div class="recap-row">
            <span class="recap-label">📅 Date de Départ :</span>
            <span class="recap-value">${dateDepart}</span>
          </div>
          <div class="recap-row">
            <span class="recap-label">📌 Motif :</span>
            <span class="recap-value">${motif}</span>
          </div>
          <div class="recap-row">
            <span class="recap-label">📝 Raison :</span>
            <span class="recap-value">${raison}</span>
          </div>
        </div>

        <div class="recap-message">
          ✅ Les données seront enregistrées dans la base de données
        </div>

        <div class="modal-buttons">
          <button class="btn-confirm" id="confirmBtn" onclick="confirmDepart()">✔️ Confirmer</button>
          <button class="btn-cancel" onclick="cancelRecap()">❌ Annuler</button>
        </div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML("beforeend", modal);
}

function confirmDepart() {
  // Empêcher les envois multiples
  if (isSubmitting) return;
  isSubmitting = true;
  
  // Désactiver le bouton
  const confirmBtn = document.getElementById('confirmBtn');
  if (confirmBtn) {
    confirmBtn.disabled = true;
    confirmBtn.style.opacity = '0.5';
    confirmBtn.style.cursor = 'not-allowed';
  }

  const formData = new FormData();
  formData.append("type", "depart");
  formData.append("hrbp", document.getElementById('hrbp').value);
  formData.append("matricule", document.getElementById('matricule').value);
  formData.append("nom", document.getElementById('nom').value);
  formData.append("fonction", document.getElementById('fonction').value);
  formData.append("dateDepart", document.getElementById('dateDepart').value);
  formData.append("motif", document.getElementById('motif').value);
  formData.append("raison", document.getElementById('raison').value);

  fetch(API_URL, {
    method: "POST",
    body: formData
  })
    .then(res => res.json())
    .then(data => {
      if (data.status === "success") {
        removeModal();
        showSuccessMessage("✅ Départ enregistré avec succès");
        setTimeout(() => {
          location.reload();
        }, 2000);
      }
      isSubmitting = false;
    })
    .catch(err => {
      console.error("Erreur : " + err.message);
      isSubmitting = false;
    });
}

// =============================
// SUBMIT MOUVEMENT (AVEC RECAP)
// =============================
function submitMouvement(e) {
  e.preventDefault();
  showRecapMouvement();
}

function showRecapMouvement() {
  const hrbp = document.getElementById('hrbp').value;
  const matricule = document.getElementById('matricule').value;
  const nom = document.getElementById('nom').value;
  const dateMvt = document.getElementById('dateMvt').value;
  const ancienPoste = document.getElementById('ancienPoste').value;
  const typeMvt = document.getElementById('typeMvt').value;
  const raisonMvt = document.getElementById('raisonMvt').value;
  const isFonctionNouvelle = document.getElementById('isFonctionNouvelle') ? document.getElementById('isFonctionNouvelle').checked : false;
  
  // Déterminer le nouveau poste selon le type de mouvement et la checkbox
  let nouveauPoste;
  if (typeMvt === "Changement d'intitulé") {
    nouveauPoste = document.getElementById('nouvelleFonctionPersonnalisee').value;
  } else if (isFonctionNouvelle) {
    // Si la checkbox "nouvelle fonction" est cochée, utiliser le champ personnalisé
    nouveauPoste = document.getElementById('nouvelleFonctionNom').value;
  } else {
    nouveauPoste = document.getElementById('nouveauPoste').value;
  }

  const modal = `
    <div class="modal-overlay">
      <div class="modal-content">
        
        <div class="recap-section">
          <div class="recap-row">
            <span class="recap-label">👤 HRBP :</span>
            <span class="recap-value">${hrbp}</span>
          </div>
          <div class="recap-row">
            <span class="recap-label">🔢 Matricule :</span>
            <span class="recap-value">${matricule}</span>
          </div>
          <div class="recap-row">
            <span class="recap-label">👨‍💼 Nom et Prénoms :</span>
            <span class="recap-value">${nom}</span>
          </div>
          <div class="recap-row">
            <span class="recap-label">📅 Date du Mouvement :</span>
            <span class="recap-value">${dateMvt}</span>
          </div>
          <div class="recap-row">
            <span class="recap-label">💼 Ancien Poste :</span>
            <span class="recap-value">${ancienPoste}</span>
          </div>
          <div class="recap-row">
            <span class="recap-label">📌 Type de Mouvement :</span>
            <span class="recap-value">${typeMvt}</span>
          </div>
          <div class="recap-row">
            <span class="recap-label">⭐ Nouveau Poste :</span>
            <span class="recap-value">${nouveauPoste}</span>
          </div>
          <div class="recap-row">
            <span class="recap-label">✨ Nouvelle Fonction :</span>
            <span class="recap-value">${isFonctionNouvelle ? '✅ Oui' : '❌ Non'}</span>
          </div>
          <div class="recap-row">
            <span class="recap-label">📝 Raison :</span>
            <span class="recap-value">${raisonMvt}</span>
          </div>
        </div>

        <div class="recap-message">
          ✅ Les données seront enregistrées dans la base de données
        </div>

        <div class="modal-buttons">
          <button class="btn-confirm" id="confirmBtn" onclick="confirmMouvement()">✔️ Confirmer</button>
          <button class="btn-cancel" onclick="cancelRecap()">❌ Annuler</button>
        </div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML("beforeend", modal);
}

function confirmMouvement() {
  // Empêcher les envois multiples
  if (isSubmitting) return;
  isSubmitting = true;
  
  // Désactiver le bouton
  const confirmBtn = document.getElementById('confirmBtn');
  if (confirmBtn) {
    confirmBtn.disabled = true;
    confirmBtn.style.opacity = '0.5';
    confirmBtn.style.cursor = 'not-allowed';
  }

  const typeMvt = document.getElementById('typeMvt').value;
  let nouveauPoste;
  
  // Déterminer le nouveau poste selon le type de mouvement et la checkbox
  if (typeMvt === "Changement d'intitulé") {
    nouveauPoste = document.getElementById('nouvelleFonctionPersonnalisee').value;
  } else if (document.getElementById('isFonctionNouvelle').checked) {
    // Si la checkbox "nouvelle fonction" est cochée, utiliser le champ personnalisé
    nouveauPoste = document.getElementById('nouvelleFonctionNom').value;
  } else {
    nouveauPoste = document.getElementById('nouveauPoste').value;
  }

  const isFonctionNouvelle = document.getElementById('isFonctionNouvelle') ? document.getElementById('isFonctionNouvelle').checked : false;

  const formData = new FormData();
  formData.append("type", "mouvement");
  formData.append("hrbp", document.getElementById('hrbp').value);
  formData.append("matricule", document.getElementById('matricule').value);
  formData.append("nom", document.getElementById('nom').value);
  formData.append("dateMvt", document.getElementById('dateMvt').value);
  formData.append("ancienPoste", document.getElementById('ancienPoste').value);
  formData.append("nouveauPoste", nouveauPoste);
  formData.append("typeMvt", typeMvt);
  formData.append("isFonctionNouvelle", isFonctionNouvelle);
  formData.append("raisonMvt", document.getElementById('raisonMvt').value);

  fetch(API_URL, {
    method: "POST",
    body: formData
  })
    .then(res => res.json())
    .then(data => {
      if (data.status === "success") {
        removeModal();
        showSuccessMessage("✅ Mouvement enregistré avec succès");
        setTimeout(() => {
          location.reload();
        }, 2000);
      }
      isSubmitting = false;
    })
    .catch(err => {
      console.error("Erreur : " + err.message);
      isSubmitting = false;
    });
}

document.addEventListener("DOMContentLoaded", loadData);

// =============================
// MODAL UTILITIES
// =============================
function cancelRecap() {
  removeModal();
}

function removeModal() {
  const modal = document.querySelector(".modal-overlay");
  if (modal) modal.remove();
}

function showSuccessMessage(message) {
  const success = `
    <div class="success-message">
      <div class="success-content">
        <h3>${message}</h3>
        <p>Redirection en cours...</p>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML("beforeend", success);
}

// =============================
// BUTTON ACTIVE STATE
// =============================
// =============================
// CREATE BUBBLE ANIMATION
// =============================
function createBubbles(buttonElement) {
  // Récupérer la position du bouton
  const rect = buttonElement.getBoundingClientRect();
  const buttonCenterX = rect.left + rect.width / 2;
  const buttonCenterY = rect.top + rect.height / 2;
  
  // Créer 6 bulles dans différentes directions
  const directions = [
    { tx: 80, ty: -80 },   // Haut-droit
    { tx: 80, ty: 80 },    // Bas-droit
    { tx: -80, ty: -80 },  // Haut-gauche
    { tx: -80, ty: 80 },   // Bas-gauche
    { tx: 100, ty: 0 },    // Droit
    { tx: 0, ty: -100 }    // Haut
  ];
  
  directions.forEach(direction => {
    const bubble = document.createElement('div');
    const size = Math.random() * 20 + 10; // Taille aléatoire entre 10-30px
    
    bubble.className = 'bubble';
    bubble.style.width = size + 'px';
    bubble.style.height = size + 'px';
    bubble.style.left = buttonCenterX + 'px';
    bubble.style.top = buttonCenterY + 'px';
    bubble.style.setProperty('--tx', direction.tx + 'px');
    bubble.style.setProperty('--ty', direction.ty + 'px');
    
    document.body.appendChild(bubble);
    
    // Déclencher l'animation immédiatement
    bubble.classList.add('floating');
    
    // Supprimer la bulle quand l'animation se termine
    bubble.addEventListener('animationend', () => {
      bubble.remove();
    }, { once: true });
  });
}

// =============================
// SET ACTIVE BUTTON
// =============================
function setActiveButton(buttonName) {
  // Enlever toutes les bulles précédentes
  const existingBubbles = document.querySelectorAll('.bubble');
  existingBubbles.forEach(bubble => bubble.remove());
  
  // Enlever la classe active de tous les boutons de navigation
  const buttons = document.querySelectorAll('.nav-btn');
  buttons.forEach(btn => btn.classList.remove('active'));
  
  // Ajouter la classe active au bouton cliqué
  if (buttonName === 'depart') {
    const btnDepart = document.getElementById('btn-depart');
    if (btnDepart) {
      btnDepart.classList.add('active');
      createBubbles(btnDepart);
    }
  } else if (buttonName === 'mouvement') {
    const btnMouvement = document.getElementById('btn-mouvement');
    if (btnMouvement) {
      btnMouvement.classList.add('active');
      createBubbles(btnMouvement);
    }
  }
}

// Event listener pour enlever la classe active quand on clique ailleurs
document.addEventListener('DOMContentLoaded', function() {
  // Enlever la classe active quand on clique sur le formulaire
  const formContainer = document.getElementById('formContainer');
  if (formContainer) {
    formContainer.addEventListener('click', function() {
      // On ne fait rien, les boutons garderont leur état
    });
  }
  
  // Enlever la classe active après l'enregistrement (dans showSuccessMessage)
  // Cela se fera automatiquement lors du reload de la page
});
