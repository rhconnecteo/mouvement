const SHEET_ID = "1Jh_ZS3lYL-wt_UHU51Ium7FkPSOLrEURdf-AkIqy5Cc";

function doPost(e) {
  return handleRequest(e.parameter);
}

function handleRequest(params) {
  try {
    const type = params.type;
    const ss = SpreadsheetApp.openById(SHEET_ID);

    // ============================
    // GET DATA
    // ============================
    if (type === "getData") {
      const baseSheet = ss.getSheetByName("Base de donnée");
      const data = baseSheet.getDataRange().getValues();
      const employes = [];
      const headers = (data[0] || []).map(normalizeHeader);
      const getValue = (row, headerName) => {
        const index = headers.indexOf(normalizeHeader(headerName));
        return index >= 0 ? row[index] : '';
      };

      for (let i = 1; i < data.length; i++) {
        if (data[i] && getValue(data[i], 'Matricule')) {
          employes.push({
            matricule: String(getValue(data[i], 'Matricule') || '').trim(),
            dateIntegration: formatDate(getValue(data[i], "Date d'intégration")) || '',
            statut: String(getValue(data[i], 'Statut') || '').trim(),
            nom: String(getValue(data[i], 'Nom et Prénoms') || '').trim(),
            fonction: String(getValue(data[i], 'Fonction') || '').trim(),
            rattachement: String(getValue(data[i], 'Rattachement') || '').trim(),
            login: String(getValue(data[i], 'Login') || '').trim(),
            mailConnecteo: String(getValue(data[i], 'Mail connecteo') || getValue(data[i], 'Mail Connecteo') || '').trim()
          });
        }
      }

      return jsonResponse({
        status: "success",
        employes: employes,
        motifsDepart: ["Démission", "Licenciement", "Congé maternité"],
        motifsMouvement: ["Basculement CDI", "Nomination", "Mutation", "Promotion"]
      });
    }

    // ============================
    // GET ENTRIES
    // ============================
    if (type === "getEntries") {
      return jsonResponse({
        status: "success",
        ...getEntries()
      });
    }

    // ============================
    // DEPART (avec HRBP)
    // ============================
    if (type === "depart") {
      const sheet = ss.getSheetByName("Départ");

      sheet.appendRow([
        formatDate(new Date()),
        params.hrbp || '',          // HRBP
        params.matricule || '',
        formatDate(params.dateIntegration) || '',
        params.statut || '',
        params.nom || '',
        params.fonction || '',
        params.rattachement || '',
        formatDate(params.dateDepart) || '',
        params.motif || '',
        params.raison || '',
        params.login || '',
        params.mailConnecteo || ''
      ]);

      return jsonResponse({
        status: "success",
        message: "Départ enregistré avec succès"
      });
    }

    // ============================
    // MOUVEMENT (avec HRBP)
    // ============================
    if (type === "mouvement") {
      const sheet = ss.getSheetByName("Mouvement");

      sheet.appendRow([
        formatDate(new Date()),
        params.hrbp || '',          // ✅ NOUVELLE COLONNE
        params.matricule || '',
        params.nom || '',
        formatDate(params.dateMvt) || '',
        params.ancienPoste || '',
        params.nouveauPoste || '',
        params.typeMvt || '',
        params.raisonMvt || ''
      ]);

      return jsonResponse({
        status: "success",
        message: "Mouvement enregistré avec succès"
      });
    }

    return jsonResponse({ status: "error", message: "Type invalide" });

  } catch (err) {
    return jsonResponse({
      status: "error",
      message: err.toString()
    });
  }
}

function normalizeHeader(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function formatDate(value) {
  if (!value) return '';
  try {
    const d = (value instanceof Date) ? value : new Date(value);
    if (isNaN(d.getTime())) return String(value);
    return Utilities.formatDate(d, Session.getScriptTimeZone(), 'dd/MM/yyyy');
  } catch (e) {
    return String(value);
  }
}

function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// Affiche une sidebar contenant l'historique des enregistrements
function showSidebar() {
  const html = HtmlService.createHtmlOutputFromFile('Sidebar').setTitle('Historique des enregistrements');
  try {
    SpreadsheetApp.getUi().showSidebar(html);
    return;
  } catch (e) {
    // si ce script est attaché à un document ou formulaire
  }

  try {
    DocumentApp.getUi().showSidebar(html);
    return;
  } catch (e) {}

  try {
    FormApp.getUi().showSidebar(html);
    return;
  } catch (e) {}

  Logger.log('Impossible d afficher la sidebar: aucun UI container trouvé');
}

// Renvoie les dernières entrées des feuilles 'Départ' et 'Mouvement'
function getEntries() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const result = { depart: [], mouvement: [] };

  const sheetDepart = ss.getSheetByName('Départ');
  if (sheetDepart) {
    const data = sheetDepart.getDataRange().getValues();
    const headers = (data[0] || []).map(normalizeHeader);
    const getValue = (row, headerName) => {
      const index = headers.indexOf(normalizeHeader(headerName));
      return index >= 0 ? row[index] : '';
    };

    for (let i = 1; i < data.length; i++) {
      if (data[i] && getValue(data[i], 'Matricule')) {
        result.depart.push({
          timestamp: formatDate(getValue(data[i], "Date d'insertion")) || new Date(),
          hrbp: getValue(data[i], 'hrbp') || '',
          matricule: String(getValue(data[i], 'Matricule') || ''),
          dateIntegration: formatDate(getValue(data[i], "Date d'intégration")) || '',
          statut: String(getValue(data[i], 'Statut') || ''),
          nom: String(getValue(data[i], 'Nom et Prénoms') || ''),
          fonction: String(getValue(data[i], 'Fonction') || ''),
          rattachement: String(getValue(data[i], 'Rattachement') || ''),
          dateDepart: formatDate(getValue(data[i], "Date de départ") || getValue(data[i], "Date de départ")) || '',
          motif: getValue(data[i], "Motif de départ") || getValue(data[i], "Motif du départ") || '',
          raison: getValue(data[i], "Raison de départ") || getValue(data[i], "Raison du départ") || '',
          login: String(getValue(data[i], 'Login') || ''),
          mailConnecteo: String(getValue(data[i], 'Mail connecteo') || getValue(data[i], 'Mail Connecteo') || '')
        });
      }
    }
  }

  const sheetMvt = ss.getSheetByName('Mouvement');
  if (sheetMvt) {
    const data2 = sheetMvt.getDataRange().getValues();
    const headers2 = (data2[0] || []).map(normalizeHeader);
    const getValue2 = (row, headerName) => {
      const index = headers2.indexOf(normalizeHeader(headerName));
      return index >= 0 ? row[index] : '';
    };

    for (let i = 1; i < data2.length; i++) {
      if (data2[i] && getValue2(data2[i], 'Matricule')) {
        result.mouvement.push({
          timestamp: formatDate(getValue2(data2[i], "Date d'insertion")) || new Date(),
          hrbp: getValue2(data2[i], 'hrbp') || '',
          matricule: String(getValue2(data2[i], 'Matricule') || ''),
          nom: String(getValue2(data2[i], 'Nom et Prénoms') || getValue2(data2[i], 'Nom') || ''),
          dateMvt: formatDate(getValue2(data2[i], "Date du mouvement") || getValue2(data2[i], "Date de mouvement")) || '',
          ancienPoste: getValue2(data2[i], "Ancien poste") || getValue2(data2[i], "Ancien Poste") || '',
          nouveauPoste: getValue2(data2[i], "Nouveau poste") || getValue2(data2[i], "Nouveau Poste") || '',
          typeMvt: getValue2(data2[i], "Type de mouvement") || getValue2(data2[i], "Type du mouvement") || '',
          raisonMvt: getValue2(data2[i], "Raison du mouvement") || getValue2(data2[i], "Raison de mouvement") || ''
        });
      }
    }
  }

  return result;
}

// Ajoute un menu dans l'UI pour ouvrir la sidebar
function onOpen() {
  try {
    SpreadsheetApp.getUi().createMenu('Mouvement').addItem('Historique','showSidebar').addToUi();
  } catch (e) {
    // ignore si pas dans un spreadsheet
  }
}
