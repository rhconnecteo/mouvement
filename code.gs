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

      for (let i = 1; i < data.length; i++) {
        if (data[i][0]) {
          employes.push({
            matricule: String(data[i][0]).trim(),
            nom: String(data[i][1]).trim(),
            fonction: String(data[i][2]).trim()
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
        new Date(),
        params.hrbp,          // ✅ NOUVELLE COLONNE
        params.matricule,
        params.nom,
        params.fonction,
        params.dateDepart,
        params.motif,
        params.raison
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
        new Date(),
        params.hrbp,          // ✅ NOUVELLE COLONNE
        params.matricule,
        params.nom,
        params.dateMvt,
        params.ancienPoste,
        params.nouveauPoste,
        params.typeMvt,
        params.raisonMvt
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
    for (let i = 1; i < data.length; i++) {
      if (data[i] && data[i][2]) {
        result.depart.push({
          timestamp: data[i][0],
          hrbp: data[i][1],
          matricule: String(data[i][2] || ''),
          nom: String(data[i][3] || ''),
          fonction: String(data[i][4] || ''),
          dateDepart: data[i][5],
          motif: data[i][6],
          raison: data[i][7]
        });
      }
    }
  }

  const sheetMvt = ss.getSheetByName('Mouvement');
  if (sheetMvt) {
    const data2 = sheetMvt.getDataRange().getValues();
    for (let i = 1; i < data2.length; i++) {
      if (data2[i] && data2[i][2]) {
        result.mouvement.push({
          timestamp: data2[i][0],
          hrbp: data2[i][1],
          matricule: String(data2[i][2] || ''),
          nom: String(data2[i][3] || ''),
          dateMvt: data2[i][4],
          ancienPoste: data2[i][5],
          nouveauPoste: data2[i][6],
          typeMvt: data2[i][7],
          raisonMvt: data2[i][8]
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
