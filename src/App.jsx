import { useEffect, useMemo, useState } from 'react';

const API_URL = import.meta.env.DEV
  ? '/apps-script'
  : (import.meta.env.VITE_APPS_SCRIPT_URL || 'https://script.google.com/macros/s/AKfycbwwKFVC_l4kKE8uZ9MU1CpUhCVICxoUZRyXX6OPmPE_2XI3TTzzPKByUmxp8Etsdt8Y/exec');
const HRBPS = ['Malala', 'Ravo', 'Koloina', 'Lanto', 'Carine', 'Chrissie', 'Mamonjisoa'];
const MOTIFS_DEPART = [
  'Congé de maternité',
  'Abandon de poste',
  'Abandon de formation',
  'Arrêt de contrat',
  'Décès',
  'Fin de période d\'essai',
  'Mobilité intra groupe',
  'Démission',
  'Licenciement',
  'Fin de projet',
  'Fin de campagne'
];
const TYPE_MOUVEMENT = [
  'Basculement CDI',
  'Basculement CDD',
  'Changement d\'intitulé',
  'Nomination au poste',
  'Mutation',
  'Basculement vers une autre poste'
];

const initialDepartForm = {
  hrbp: '',
  employeeSearch: '',
  selectedEmployee: null,
  dateDepart: '',
  motif: '',
  raison: ''
};

const initialMouvementForm = {
  hrbp: '',
  employeeSearch: '',
  selectedEmployee: null,
  dateMvt: '',
  typeMvt: '',
  nouvelleFonctionPersonnalisee: '',
  isFonctionNouvelle: false,
  nouvelleFonctionNom: '',
  nouveauPoste: '',
  raisonMvt: ''
};

function normalizeEmployee(employee) {
  if (!employee) return null;

  return {
    matricule: String(employee.matricule || '').trim(),
    dateIntegration: employee.dateIntegration || employee.date_intégration || employee['Date d\'intégration'] || '',
    statut: employee.statut || employee.status || employee['Statut'] || '',
    nom: String(employee.nom || employee['Nom et Prénoms'] || '').trim(),
    fonction: String(employee.fonction || employee['Fonction'] || '').trim(),
    rattachement: String(employee.rattachement || employee['Rattachement'] || '').trim(),
    login: String(employee.login || employee['Login'] || '').trim(),
    mailConnecteo: String(employee.mailConnecteo || employee['Mail connecteo'] || employee['Mail Connecteo'] || '').trim()
  };
}

function formatDate(value) {
  if (!value) return '';

  if (value instanceof Date) {
    if (isNaN(value.getTime())) return '';
    const day = String(value.getDate()).padStart(2, '0');
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const year = value.getFullYear();
    return `${day}/${month}/${year}`;
  }

  const text = String(value).trim();
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(text)) {
    return text;
  }

  const isoMatch = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    return `${isoMatch[3]}/${isoMatch[2]}/${isoMatch[1]}`;
  }

  try {
    const d = new Date(text);
    if (isNaN(d.getTime())) return text;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  } catch (e) {
    return text;
  }
}

function parseBoolean(value) {
  if (value === true || value === 'true' || value === 'TRUE' || value === 1 || value === '1') return true;
  if (value === false || value === 'false' || value === 'FALSE' || value === 0 || value === '0' || value === '' || value == null) return false;
  return Boolean(value);
}

function App() {
  const [activeTab, setActiveTab] = useState('depart');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [employes, setEmployes] = useState([]);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [departForm, setDepartForm] = useState(initialDepartForm);
  const [mouvementForm, setMouvementForm] = useState(initialMouvementForm);
  const [submitErrors, setSubmitErrors] = useState({});
  const [modalMode, setModalMode] = useState(null);
  const [modalData, setModalData] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sheetEntries, setSheetEntries] = useState({ depart: [], mouvement: [] });
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState('');
  const [kpiFilters, setKpiFilters] = useState({
    matricule: '',
    nom: '',
    fonction: '',
    dateFrom: '',
    dateTo: ''
  });
  const [tableauFilters, setTableauFilters] = useState({
    fonction: '',
    rattachement: '',
    dateFrom: '',
    dateTo: '',
    checking: ''
  });
  const [ticketStep, setTicketStep] = useState('selection');
  const [ticketSelectedRows, setTicketSelectedRows] = useState([]);
  const [ticketName, setTicketName] = useState('');
  const [ticketMessage, setTicketMessage] = useState('');
  const [isTicketSubmitting, setIsTicketSubmitting] = useState(false);

  const allFonctions = useMemo(
    () => Array.from(new Set(employes.map(emp => emp.fonction))).sort(),
    [employes]
  );

  const departSuggestions = useMemo(() => {
    const search = departForm.employeeSearch.trim().toLowerCase();
    if (search.length < 2) return [];

    const tokens = search.split(/\s+/);
    return employes.filter(emp => {
      const matricule = emp.matricule.toLowerCase();
      const nom = emp.nom.toLowerCase();
      const nomParts = nom.split(/\s+/);
      return tokens.every(token => (
        matricule.startsWith(token)
        || nomParts.some(part => part.startsWith(token))
      ));
    }).slice(0, 20);
  }, [departForm.employeeSearch, employes]);

  const mouvementSuggestions = useMemo(() => {
    const search = mouvementForm.employeeSearch.trim().toLowerCase();
    if (search.length < 2) return [];

    const tokens = search.split(/\s+/);
    return employes.filter(emp => {
      const matricule = emp.matricule.toLowerCase();
      const nom = emp.nom.toLowerCase();
      const nomParts = nom.split(/\s+/);
      return tokens.every(token => (
        matricule.startsWith(token)
        || nomParts.some(part => part.startsWith(token))
      ));
    }).slice(0, 20);
  }, [mouvementForm.employeeSearch, employes]);

  const mouvementPostes = useMemo(() => {
    if (!mouvementForm.selectedEmployee) return allFonctions;
    return allFonctions.filter(fonction => fonction !== mouvementForm.selectedEmployee.fonction);
  }, [allFonctions, mouvementForm.selectedEmployee]);

  const ticketRows = useMemo(() => {
    return sheetEntries.depart;
  }, [sheetEntries.depart]);

  const ticketAvailableRows = useMemo(() => {
    return ticketRows.filter(record => !String(record.ticket || '').trim());
  }, [ticketRows]);

  const ticketSelectedRecords = useMemo(() => {
    const selected = new Set(ticketSelectedRows.map(Number));
    return ticketRows.filter(record => selected.has(Number(record.rowNumber)));
  }, [ticketRows, ticketSelectedRows]);

  // Calculer les KPIs
  const kpiStats = useMemo(() => {
    const departsByFunction = {};
    const mouvementsByFunction = {};
    let totalDeparts = 0;
    let totalMouvements = 0;
    const combinedRecords = [];

    sheetEntries.depart.forEach(record => {
      totalDeparts++;
      const fonction = record.fonction || 'Non spécifiée';
      departsByFunction[fonction] = (departsByFunction[fonction] || 0) + 1;
      combinedRecords.push({
        type: 'depart',
        data: record,
        date: record.timestamp,
        id: `${record.timestamp || ''}-depart-${record.matricule || ''}`
      });
    });

    sheetEntries.mouvement.forEach(record => {
      totalMouvements++;
      const ancienPoste = record.ancienPoste || 'Non spécifiée';
      mouvementsByFunction[ancienPoste] = (mouvementsByFunction[ancienPoste] || 0) + 1;
      combinedRecords.push({
        type: 'mouvement',
        data: record,
        date: record.timestamp,
        id: `${record.timestamp || ''}-mouvement-${record.matricule || ''}`
      });
    });

    combinedRecords.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

    return {
      departsByFunction,
      mouvementsByFunction,
      totalDeparts,
      totalMouvements,
      records: combinedRecords
    };
  }, [sheetEntries]);

  useEffect(() => {
    loadData();
    loadHistory();
  }, []);

  useEffect(() => {
    if (dataLoaded) {
      setActiveTab('depart');
    }
  }, [dataLoaded]);

  async function loadData() {
    setIsLoading(true);
    setLoadError('');

    try {
      const params = new URLSearchParams();
      params.append('type', 'getData');

      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
        body: params.toString()
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();

      if (data.status !== 'success') {
        throw new Error(data.message || 'Erreur serveur');
      }

      setEmployes((data.employes || []).map(normalizeEmployee).filter(Boolean));
      setDataLoaded(true);
    } catch (error) {
      setLoadError(error.message || 'Impossible de charger les données');
      setDataLoaded(false);
    } finally {
      setIsLoading(false);
    }
  }

  async function loadHistory() {
    setIsHistoryLoading(true);
    setHistoryError('');

    try {
      const params = new URLSearchParams();
      params.append('type', 'getEntries');

      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
        body: params.toString()
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();

      if (data.status !== 'success') {
        throw new Error(data.message || 'Erreur serveur');
      }

      const normalizedDepartRows = (data.depart || []).map((record, index) => ({
        ...record,
        checking: parseBoolean(record.checking),
        rowNumber: record.rowNumber ?? index + 2
      }));

      const normalizedMouvementRows = (data.mouvement || []).map((record, index) => ({
        ...record,
        checking: parseBoolean(record.checking),
        rowNumber: record.rowNumber ?? index + 2
      }));

      setSheetEntries({
        depart: normalizedDepartRows,
        mouvement: normalizedMouvementRows
      });
    } catch (error) {
      setHistoryError(error.message || 'Impossible de charger l\'historique');
      setSheetEntries({ depart: [], mouvement: [] });
    } finally {
      setIsHistoryLoading(false);
    }
  }

  async function updateCheckingState(sheetName, rowNumber, checking) {
    const params = new URLSearchParams();
    params.append('type', 'updateChecking');
    params.append('sheetName', sheetName);
    params.append('rowNumber', String(rowNumber));
    params.append('checking', checking ? 'true' : 'false');

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
      body: params.toString()
    });

    const data = await response.json();
    if (!response.ok || data.status !== 'success') {
      throw new Error((data && data.message) || `HTTP ${response.status}`);
    }

    await loadHistory();
  }

  async function testBackend() {
    try {
      const params = new URLSearchParams();
      params.append('type', 'debugEcho');
      params.append('client', 'react-app');

      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
        body: params.toString()
      });

      const data = await response.json();
      setTicketMessage('Test response: ' + JSON.stringify(data));
      return data;
    } catch (err) {
      setTicketMessage('Test failed: ' + (err.message || err));
      return null;
    }
  }

  function resetTicketState() {
    setTicketStep('selection');
    setTicketSelectedRows([]);
    setTicketName('');
    setTicketMessage('');
    setIsTicketSubmitting(false);
  }

  function handleSidebarToggle() {
    setSidebarCollapsed(value => !value);
  }

  function handleTabChange(tab) {
    setSubmitErrors({});
    setActiveTab(tab);
    if (tab !== 'ticket') {
      setTicketMessage('');
    } else {
      resetTicketState();
    }
  }

  function handleDepartFieldChange(field, value) {
    setDepartForm(prev => ({ ...prev, [field]: value }));
  }

  function handleMouvementFieldChange(field, value) {
    setMouvementForm(prev => ({ ...prev, [field]: value }));
  }

  function selectDepartEmployee(employee) {
    setDepartForm(prev => ({
      ...prev,
      selectedEmployee: normalizeEmployee(employee),
      employeeSearch: ''
    }));
  }

  function selectMouvementEmployee(employee) {
    setMouvementForm(prev => ({
      ...prev,
      selectedEmployee: normalizeEmployee(employee),
      employeeSearch: '',
      nouveauPoste: ''
    }));
  }

  function validateDepartForm() {
    const errors = {};

    if (!departForm.selectedEmployee) {
      errors.employee = 'Veuillez sélectionner un employé.';
    }
    if (!departForm.hrbp) {
      errors.hrbp = 'Veuillez choisir un HRBP.';
    }
    if (!departForm.dateDepart) {
      errors.dateDepart = 'Veuillez indiquer la date de départ.';
    }
    if (!departForm.motif) {
      errors.motif = 'Veuillez sélectionner un motif.';
    }
    if ((departForm.motif === 'Démission' || departForm.motif === 'Licenciement') && !departForm.raison.trim()) {
      errors.raison = 'La raison est obligatoire pour ce motif.';
    }

    return errors;
  }

  function validateMouvementForm() {
    const errors = {};

    if (!mouvementForm.selectedEmployee) {
      errors.employee = 'Veuillez sélectionner un employé.';
    }
    if (!mouvementForm.hrbp) {
      errors.hrbp = 'Veuillez choisir un HRBP.';
    }
    if (!mouvementForm.dateMvt) {
      errors.dateMvt = 'Veuillez indiquer la date du mouvement.';
    }
    if (!mouvementForm.typeMvt) {
      errors.typeMvt = 'Veuillez sélectionner un type de mouvement.';
    }

    if (mouvementForm.typeMvt === "Changement d'intitulé") {
      if (!mouvementForm.nouvelleFonctionPersonnalisee.trim()) {
        errors.nouvelleFonctionPersonnalisee = 'Veuillez indiquer la nouvelle fonction.';
      }
    } else if (mouvementForm.isFonctionNouvelle) {
      if (!mouvementForm.nouvelleFonctionNom.trim()) {
        errors.nouvelleFonctionNom = 'Veuillez indiquer la nouvelle fonction.';
      }
    } else if (!mouvementForm.nouveauPoste) {
      errors.nouveauPoste = 'Veuillez choisir un nouveau poste.';
    }

    return errors;
  }

  function buildDepartData() {
    return {
      hrbp: departForm.hrbp,
      matricule: departForm.selectedEmployee?.matricule || '',
      dateIntegration: departForm.selectedEmployee?.dateIntegration || '',
      statut: departForm.selectedEmployee?.statut || '',
      nom: departForm.selectedEmployee?.nom || '',
      fonction: departForm.selectedEmployee?.fonction || '',
      rattachement: departForm.selectedEmployee?.rattachement || '',
      login: departForm.selectedEmployee?.login || '',
      mailConnecteo: departForm.selectedEmployee?.mailConnecteo || '',
      dateDepart: departForm.dateDepart,
      motif: departForm.motif,
      raison: departForm.raison
    };
  }

  function buildMouvementData() {
    const nouveauPoste =
      mouvementForm.typeMvt === "Changement d'intitulé"
        ? mouvementForm.nouvelleFonctionPersonnalisee
        : mouvementForm.isFonctionNouvelle
        ? mouvementForm.nouvelleFonctionNom
        : mouvementForm.nouveauPoste;

    return {
      hrbp: mouvementForm.hrbp,
      matricule: mouvementForm.selectedEmployee?.matricule || '',
      nom: mouvementForm.selectedEmployee?.nom || '',
      dateMvt: mouvementForm.dateMvt,
      ancienPoste: mouvementForm.selectedEmployee?.fonction || '',
      nouveauPoste,
      typeMvt: mouvementForm.typeMvt,
      isFonctionNouvelle: mouvementForm.isFonctionNouvelle,
      raisonMvt: mouvementForm.raisonMvt
    };
  }

  function handleSubmitDepart(event) {
    event.preventDefault();
    const errors = validateDepartForm();
    setSubmitErrors(errors);

    if (Object.keys(errors).length > 0) {
      return;
    }

    submitRecord('depart', buildDepartData());
  }

  function handleSubmitMouvement(event) {
    event.preventDefault();
    const errors = validateMouvementForm();
    setSubmitErrors(errors);

    if (Object.keys(errors).length > 0) {
      return;
    }

    submitRecord('mouvement', buildMouvementData());
  }

  async function submitRecord(mode, recordData) {
    if (!mode || !recordData || isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    const params = new URLSearchParams();
    params.append('type', mode);
    Object.entries(recordData).forEach(([key, value]) => {
      params.append(key, value == null ? '' : String(value));
    });

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
        body: params.toString()
      });
      const result = await response.json();

      if (result.status === 'success') {
        await loadHistory();

        const successMsg =
          mode === 'depart'
            ? '✅ Départ enregistré avec succès'
            : '✅ Mouvement enregistré avec succès';
        
        setSuccessMessage(successMsg);
        
        // Auto-effacer le message après 4 secondes
        setTimeout(() => {
          setSuccessMessage('');
        }, 4000);
        
        // Réinitialiser les formulaires
        if (mode === 'depart') {
          setDepartForm(initialDepartForm);
        } else {
          setMouvementForm(initialMouvementForm);
        }
        setSubmitErrors({});
      } else {
        throw new Error(result.message || 'Erreur serveur');
      }
    } catch (error) {
      console.error(error);
      setSuccessMessage('❌ Impossible de soumettre le formulaire.');
      
      // Auto-effacer le message d'erreur après 5 secondes
      setTimeout(() => {
        setSuccessMessage('');
      }, 5000);
    } finally {
      setIsSubmitting(false);
    }
  }

  function toggleTicketRow(rowNumber) {
    setTicketSelectedRows(prev => {
      const rowValue = Number(rowNumber);
      return prev.includes(rowValue)
        ? prev.filter(item => item !== rowValue)
        : [...prev, rowValue];
    });
  }

  function selectAllTicketRows() {
    setTicketSelectedRows(ticketAvailableRows.map(record => Number(record.rowNumber)));
  }

  function clearTicketSelection() {
    setTicketSelectedRows([]);
  }

  function goToTicketDetails() {
    if (ticketSelectedRows.length === 0) {
      setTicketMessage('Sélectionnez au moins un départ.');
      return;
    }

    setTicketMessage('');
    setTicketStep('details');
  }

  async function saveTicketBatch() {
    if (!ticketName.trim()) {
      setTicketMessage('Le nom du ticket est obligatoire.');
      return;
    }

    if (ticketSelectedRows.length === 0) {
      setTicketMessage('Aucun départ sélectionné.');
      setTicketStep('selection');
      return;
    }

    setIsTicketSubmitting(true);
    setTicketMessage('');

    const params = new URLSearchParams();
    params.append('type', 'saveTickets');
    params.append('ticket', ticketName.trim());
    params.append('selectedRows', JSON.stringify(ticketSelectedRows));

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
        body: params.toString()
      });

      const result = await response.json();

      if (result.status !== 'success') {
        throw new Error(result.message || 'Erreur serveur');
      }

      await loadHistory();
      setSuccessMessage('✅ Ticket enregistré avec succès');
      setTimeout(() => {
        setSuccessMessage('');
      }, 4000);
      resetTicketState();
      setTicketMessage(result.message || 'Ticket enregistré.');
    } catch (error) {
      setTicketMessage(error.message || 'Impossible d’enregistrer le ticket.');
    } finally {
      setIsTicketSubmitting(false);
    }
  }

  function renderStatusCard() {
    if (isLoading) {
      return (
        <div className="status-card">
          <h3>Chargement des données…</h3>
          <p>Merci de patienter un instant.</p>
        </div>
      );
    }

    if (loadError) {
      return (
        <div className="status-card">
          <h3><i className="fas fa-triangle-exclamation" /> Erreur de chargement</h3>
          <p>{loadError}</p>
          <button onClick={loadData}>Réessayer</button>
        </div>
      );
    }

    if (!dataLoaded || employes.length === 0) {
      return (
        <div className="status-card">
          <h3><i className="fas fa-circle-exclamation" /> Données manquantes</h3>
          <p>Aucun employé n'a été trouvé dans la base.</p>
          <button onClick={loadData}>Réessayer</button>
        </div>
      );
    }

    return null;
  }

  function renderTicketContent() {
    const selectedSet = new Set(ticketSelectedRows.map(Number));
    const allSelected = ticketAvailableRows.length > 0 && ticketAvailableRows.every(record => selectedSet.has(Number(record.rowNumber)));
    const someSelected = ticketAvailableRows.some(record => selectedSet.has(Number(record.rowNumber)));
    const todayLabel = formatDate(new Date());

    return (
      <div className="kpi-dashboard ticket-dashboard">
        <div className="kpi-dashboard-header">
          <h3><i className="fas fa-ticket" /> Création de ticket</h3>
          <button className="kpi-dashboard-refresh" onClick={loadHistory} title="Rafraîchir l'historique">
            <i className="fas fa-rotate" />
          </button>
          <button className="kpi-dashboard-refresh" onClick={testBackend} title="Tester le backend" style={{marginLeft:8}}>
            <i className="fas fa-bug" />
          </button>
        </div>

        {isHistoryLoading ? (
          <div className="kpi-dashboard-empty">
            <p>Chargement des départs sans ticket…</p>
          </div>
        ) : historyError ? (
          <div className="kpi-dashboard-empty">
            <p>{historyError}</p>
          </div>
        ) : ticketStep === 'selection' ? (
          <div className="kpi-dashboard-section">
            <div className="kpi-dashboard-item" style={{ marginBottom: 12, justifyContent: 'space-between' }}>
              <span className="kpi-dashboard-function">Départs disponibles</span>
              <span className="kpi-count depart-count">{ticketAvailableRows.length}</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 12, marginBottom: 16 }}>
              <div className="stat-card depart">
                <div className="stat-label">Sélectionnés</div>
                <div className="stat-value">{ticketSelectedRows.length}</div>
              </div>
              <div className="stat-card mouvement">
                <div className="stat-label">Date du jour</div>
                <div className="stat-value">{todayLabel}</div>
              </div>
              <div className="stat-card depart">
                <div className="stat-label">Écran</div>
                <div className="stat-value">1 / 2</div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
              <button type="button" className="kpi-filter-clear" onClick={selectAllTicketRows}>Tout cocher</button>
              <button type="button" className="kpi-filter-clear" onClick={clearTicketSelection}>Tout décocher</button>
              <button type="button" className="kpi-filter-clear" onClick={() => loadHistory()}>Rafraîchir</button>
              <button type="button" className="nav-btn active" style={{ marginLeft: 'auto' }} onClick={goToTicketDetails}>
                Suivant
              </button>
            </div>

            {ticketMessage ? <div className="error-text" style={{ marginBottom: 12 }}>{ticketMessage}</div> : null}

            {ticketRows.length === 0 ? (
              <div className="kpi-dashboard-empty">
                <p>Aucun départ sans ticket</p>
              </div>
            ) : (
              <div className="table-scroll">
                <table className="kpi-table">
                  <thead>
                    <tr>
                      <th>
                        <input
                          type="checkbox"
                          checked={allSelected}
                          ref={element => {
                            if (element) {
                              element.indeterminate = someSelected && !allSelected;
                            }
                          }}
                          onChange={event => {
                            if (event.target.checked) {
                              selectAllTicketRows();
                            } else {
                              clearTicketSelection();
                            }
                          }}
                        />
                      </th>
                      <th>Date insertion</th>
                      <th>HRBP</th>
                      <th>Matricule</th>
                      <th>Date intégration</th>
                      <th>Statut</th>
                      <th>Nom</th>
                      <th>Fonction</th>
                      <th>Rattachement</th>
                      <th>Date départ</th>
                      <th>Motif</th>
                      <th>Raison</th>
                      <th>Login</th>
                      <th>Mail</th>
                      <th>Ticket</th>
                      <th>Date création</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ticketRows.map((record, index) => {
                      const rowKey = record.rowNumber ?? index;
                      const isSelected = selectedSet.has(Number(record.rowNumber));
                      const alreadyTicketed = Boolean(String(record.ticket || '').trim());
                      return (
                        <tr key={record.id || `ticket-row-${rowKey}`} className={isSelected ? 'selected-row' : ''}>
                          <td>
                            <input
                              type="checkbox"
                              disabled={alreadyTicketed}
                              checked={isSelected}
                              onChange={() => toggleTicketRow(rowKey)}
                            />
                          </td>
                          <td>{formatDate(record.timestamp)}</td>
                          <td>{record.hrbp}</td>
                          <td>{record.matricule}</td>
                          <td>{formatDate(record.dateIntegration)}</td>
                          <td>{record.statut}</td>
                          <td>{record.nom}</td>
                          <td>{record.fonction}</td>
                          <td>{record.rattachement}</td>
                          <td>{formatDate(record.dateDepart)}</td>
                          <td>{record.motif}</td>
                          <td>{record.raison}</td>
                          <td>{record.login}</td>
                          <td>{record.mailConnecteo}</td>
                          <td>{record.ticket || ''}</td>
                          <td>{record.dateCreation ? formatDate(record.dateCreation) : ''}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : (
          <div className="kpi-dashboard-section">
            <div className="kpi-dashboard-item" style={{ marginBottom: 12, justifyContent: 'space-between' }}>
              <span className="kpi-dashboard-function">Ticket sélectionné</span>
              <span className="kpi-count mouvement-count">{ticketSelectedRecords.length} collaborateur(s)</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12, marginBottom: 16 }}>
              <div className="stat-card depart">
                <div className="stat-label">Date de création</div>
                <div className="stat-value">{todayLabel}</div>
              </div>
              <div className="stat-card mouvement">
                <div className="stat-label">Écran</div>
                <div className="stat-value">2 / 2</div>
              </div>
            </div>

            <div className="kpi-filter-grid">
              <div className="kpi-filter-field">
                <label htmlFor="ticket-name">Nom du ticket :</label>
                <input
                  id="ticket-name"
                  type="text"
                  placeholder="Ex. Ticket départ mai 2026"
                  value={ticketName}
                  onChange={event => setTicketName(event.target.value)}
                />
              </div>
              <div className="kpi-filter-field">
                <label htmlFor="ticket-date">Date de création :</label>
                <input id="ticket-date" type="text" value={todayLabel} readOnly />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12, marginBottom: 12 }}>
              <button type="button" className="kpi-filter-clear" onClick={() => setTicketStep('selection')}>Retour</button>
              <button type="button" className="kpi-filter-clear" onClick={() => setTicketName('')}>Vider</button>
              <button type="button" className="nav-btn active" style={{ marginLeft: 'auto' }} onClick={saveTicketBatch} disabled={isTicketSubmitting}>
                {isTicketSubmitting ? 'Enregistrement…' : 'Enregistrer'}
              </button>
            </div>

            {ticketMessage ? <div className="error-text" style={{ marginBottom: 12 }}>{ticketMessage}</div> : null}

            <div className="table-scroll">
              <table className="kpi-table">
                <thead>
                  <tr>
                    <th>Date insertion</th>
                    <th>Matricule</th>
                    <th>Nom</th>
                    <th>Fonction</th>
                    <th>Rattachement</th>
                    <th>Date départ</th>
                  </tr>
                </thead>
                <tbody>
                  {ticketSelectedRecords.map((record, index) => {
                    const rowKey = record.rowNumber ?? index;
                    return (
                    <tr key={record.id || `ticket-selected-${rowKey}`}>
                      <td>{formatDate(record.timestamp)}</td>
                      <td>{record.matricule}</td>
                      <td>{record.nom}</td>
                      <td>{record.fonction}</td>
                      <td>{record.rattachement}</td>
                      <td>{formatDate(record.dateDepart)}</td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    );
  }

  function renderKPIContent() {
    const hasKpiFilters = Boolean(
      kpiFilters.matricule ||
      kpiFilters.nom ||
      kpiFilters.fonction ||
      kpiFilters.dateFrom ||
      kpiFilters.dateTo
    );

    const matchesDateRange = (recordDateValue) => {
      if (!kpiFilters.dateFrom && !kpiFilters.dateTo) return true;

      const recordDate = new Date(recordDateValue || 0);
      if (Number.isNaN(recordDate.getTime())) return false;

      if (kpiFilters.dateFrom) {
        const fromDate = new Date(kpiFilters.dateFrom);
        if (recordDate < fromDate) return false;
      }

      if (kpiFilters.dateTo) {
        const toDate = new Date(kpiFilters.dateTo);
        toDate.setHours(23, 59, 59, 999);
        if (recordDate > toDate) return false;
      }

      return true;
    };

    // Fonction de filtrage des enregistrements
    const filteredRecords = kpiStats.records.filter(record => {
      const dataToCheck = record.data || {};
      
      // Filtre par matricule
      if (kpiFilters.matricule && 
          !String(dataToCheck.matricule || '').toLowerCase().includes(kpiFilters.matricule.toLowerCase())) {
        return false;
      }
      
      // Filtre par nom
      if (kpiFilters.nom && 
          !String(dataToCheck.nom || '').toLowerCase().includes(kpiFilters.nom.toLowerCase())) {
        return false;
      }

      const fonctionValue = String(
        record.type === 'depart'
          ? dataToCheck.fonction || ''
          : dataToCheck.ancienPoste || ''
      ).toLowerCase();

      if (kpiFilters.fonction && !fonctionValue.includes(kpiFilters.fonction.toLowerCase())) {
        return false;
      }
      
      // Filtre par date (date de départ ou mouvement)
      if (!matchesDateRange(record.type === 'depart' ? dataToCheck.dateDepart : dataToCheck.dateMvt)) {
        return false;
      }
      
      return true;
    });

    const filteredDepartRecords = filteredRecords.filter(record => record.type === 'depart');
    const filteredMouvementRecords = filteredRecords.filter(record => record.type === 'mouvement');

    // Calculer les totaux filtrés
    let filteredDepartCount = 0;
    let filteredMouvementCount = 0;
    filteredRecords.forEach(record => {
      if (record.type === 'depart') {
        filteredDepartCount++;
      } else if (record.type === 'mouvement') {
        filteredMouvementCount++;
      }
    });

    return (
      <div className="kpi-dashboard">
        <div className="kpi-dashboard-header">
          <h3><i className="fas fa-chart-bar" /> KPIs</h3>
          <button 
            className="kpi-dashboard-refresh"
            onClick={() => {
              loadHistory();
            }}
            title="Rafraîchir l'historique"
          >
            <i className="fas fa-rotate" />
          </button>
        </div>

        {historyError ? (
          <div className="kpi-dashboard-empty">
            <p>{historyError}</p>
          </div>
        ) : kpiStats.records.length === 0 ? (
          <div className="kpi-dashboard-empty">
            <p>Aucun départ ou mouvement enregistré</p>
          </div>
        ) : (
          <>
            <div className="kpi-dashboard-section">
              <h4><i className="fas fa-filter" /> Filtres</h4>
              <div className="kpi-filter-grid">
                <div className="kpi-filter-field">
                  <label htmlFor="filter-matricule">Matricule :</label>
                  <input
                    id="filter-matricule"
                    type="text"
                    placeholder="Rechercher par matricule…"
                    value={kpiFilters.matricule}
                    onChange={e => setKpiFilters(prev => ({ ...prev, matricule: e.target.value }))}
                  />
                </div>
                <div className="kpi-filter-field">
                  <label htmlFor="filter-nom">Nom & Prénom :</label>
                  <input
                    id="filter-nom"
                    type="text"
                    placeholder="Rechercher par nom…"
                    value={kpiFilters.nom}
                    onChange={e => setKpiFilters(prev => ({ ...prev, nom: e.target.value }))}
                  />
                </div>
                <div className="kpi-filter-field">
                  <label htmlFor="filter-fonction">Fonction :</label>
                  <input
                    id="filter-fonction"
                    type="text"
                    placeholder="Rechercher par fonction…"
                    value={kpiFilters.fonction}
                    onChange={e => setKpiFilters(prev => ({ ...prev, fonction: e.target.value }))}
                  />
                </div>
                <div className="kpi-filter-field">
                  <label htmlFor="filter-date-from">Du :</label>
                  <input
                    id="filter-date-from"
                    type="date"
                    value={kpiFilters.dateFrom}
                    onChange={e => setKpiFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
                  />
                </div>
                <div className="kpi-filter-field">
                  <label htmlFor="filter-date-to">Au :</label>
                  <input
                    id="filter-date-to"
                    type="date"
                    value={kpiFilters.dateTo}
                    onChange={e => setKpiFilters(prev => ({ ...prev, dateTo: e.target.value }))}
                  />
                </div>
              </div>
              <button
                className="kpi-filter-clear"
                onClick={() => setKpiFilters({ matricule: '', nom: '', fonction: '', dateFrom: '', dateTo: '' })}
              >
                <i className="fas fa-times" /> Réinitialiser filtres
              </button>
            </div>

            <div className="kpi-dashboard-stats">
              <div className="stat-card depart kpi-dashboard-stat">
                <div className="stat-icon">
                  <i className="fas fa-sign-out-alt" />
                </div>
                <div className="stat-info">
                  <div className="stat-label">Total Départs</div>
                  <div className="stat-value">{filteredDepartCount}</div>
                  {hasKpiFilters && 
                    <div className="stat-subtext">({kpiStats.totalDeparts} au total)</div>
                  }
                </div>
              </div>
              <div className="stat-card mouvement kpi-dashboard-stat">
                <div className="stat-icon">
                  <i className="fas fa-exchange-alt" />
                </div>
                <div className="stat-info">
                  <div className="stat-label">Total Mouvements</div>
                  <div className="stat-value">{filteredMouvementCount}</div>
                  {hasKpiFilters && 
                    <div className="stat-subtext">({kpiStats.totalMouvements} au total)</div>
                  }
                </div>
              </div>
            </div>

            <div className="kpi-dashboard-section">
              <h4><i className="fas fa-sign-out-alt" /> Départs par Fonction</h4>
              <div className="kpi-dashboard-list">
                {Object.keys(kpiStats.departsByFunction).length === 0 ? (
                  <p className="empty-text">Aucun départ</p>
                ) : (
                  Object.entries(kpiStats.departsByFunction)
                    .sort((a, b) => b[1] - a[1])
                    .map(([fonction, count]) => (
                      <div key={`depart-${fonction}`} className="kpi-dashboard-item">
                        <span className="kpi-dashboard-function">{fonction}</span>
                        <span className="kpi-count depart-count">{count}</span>
                      </div>
                    ))
                )}
              </div>
            </div>

            <div className="kpi-dashboard-section">
              <h4><i className="fas fa-exchange-alt" /> Mouvements par Fonction</h4>
              <div className="kpi-dashboard-list">
                {Object.keys(kpiStats.mouvementsByFunction).length === 0 ? (
                  <p className="empty-text">Aucun mouvement</p>
                ) : (
                  Object.entries(kpiStats.mouvementsByFunction)
                    .sort((a, b) => b[1] - a[1])
                    .map(([fonction, count]) => (
                      <div key={`mouvement-${fonction}`} className="kpi-dashboard-item">
                        <span className="kpi-dashboard-function">{fonction}</span>
                        <span className="kpi-count mouvement-count">{count}</span>
                      </div>
                    ))
                )}
              </div>
            </div>

            <div className="kpi-dashboard-section">
              <h4><i className="fas fa-list" /> Tous les Enregistrements ({filteredRecords.length})</h4>
              {filteredRecords.length === 0 ? (
                <p className="empty-text">Aucun enregistrement ne correspond aux filtres</p>
              ) : (
                <div className="kpi-dashboard-history">
                  {filteredRecords.map((record, idx) => (
                    <div key={record.id || idx} className={`history-item ${record.type}`}>
                      <div className="history-icon">
                        {record.type === 'depart' ? (
                          <i className="fas fa-sign-out-alt" />
                        ) : (
                          <i className="fas fa-exchange-alt" />
                        )}
                      </div>
                      <div className="history-details">
                        <div className="history-name">
                          {record.data?.matricule} - {record.data?.nom}
                        </div>
                        <div className="history-meta">
                          {record.type === 'depart' 
                            ? `Départ - ${record.data?.fonction}` 
                            : `Mouvement - ${record.data?.ancienPoste}`}
                        </div>
                        <div className="history-submeta">
                          {record.type === 'depart' ? (
                            <>
                              <span>Motif: {record.data?.motif}</span>
                              {record.data?.raison?.trim() ? (
                                <span> • Raison: {record.data.raison}</span>
                              ) : null}
                            </>
                          ) : (
                            `Destination: ${record.data?.nouveauPoste || 'Non spécifiée'} • Type: ${record.data?.typeMvt}`
                          )}
                        </div>
                      </div>
                      <div className="history-date">
                        {formatDate(record.type === 'depart' ? record.data?.dateDepart : record.data?.dateMvt)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </>
        )}
      </div>
    );
  }

  function renderTableauContent() {
    const hasTableauFilters = Boolean(
      tableauFilters.fonction ||
      tableauFilters.rattachement ||
      tableauFilters.dateFrom ||
      tableauFilters.dateTo ||
      tableauFilters.checking
    );

    const matchesDateRange = (recordDateValue) => {
      if (!tableauFilters.dateFrom && !tableauFilters.dateTo) return true;

      const recordDate = new Date(recordDateValue || 0);
      if (Number.isNaN(recordDate.getTime())) return false;

      if (tableauFilters.dateFrom) {
        const fromDate = new Date(tableauFilters.dateFrom);
        if (recordDate < fromDate) return false;
      }

      if (tableauFilters.dateTo) {
        const toDate = new Date(tableauFilters.dateTo);
        toDate.setHours(23, 59, 59, 999);
        if (recordDate > toDate) return false;
      }

      return true;
    };

    const filteredDepartRecords = sheetEntries.depart.filter(record => {
      const fonctionValue = String(record.fonction || '').toLowerCase();
      const rattachementValue = String(record.rattachement || '').toLowerCase();
      const checkingValue = Boolean(record.checking);

      if (tableauFilters.fonction && !fonctionValue.includes(tableauFilters.fonction.toLowerCase())) {
        return false;
      }

      if (tableauFilters.rattachement && !rattachementValue.includes(tableauFilters.rattachement.toLowerCase())) {
        return false;
      }

      if (tableauFilters.checking === 'checked' && !checkingValue) {
        return false;
      }

      if (tableauFilters.checking === 'unchecked' && checkingValue) {
        return false;
      }

      return matchesDateRange(record.dateDepart);
    });

    const filteredMouvementRecords = sheetEntries.mouvement.filter(record => {
      const fonctionValue = String(record.ancienPoste || '').toLowerCase();
      const rattachementValue = String(record.rattachement || '').toLowerCase();
      const checkingValue = Boolean(record.checking);

      if (tableauFilters.fonction && !fonctionValue.includes(tableauFilters.fonction.toLowerCase())) {
        return false;
      }

      if (tableauFilters.rattachement && !rattachementValue.includes(tableauFilters.rattachement.toLowerCase())) {
        return false;
      }

      if (tableauFilters.checking === 'checked' && !checkingValue) {
        return false;
      }

      if (tableauFilters.checking === 'unchecked' && checkingValue) {
        return false;
      }

      return matchesDateRange(record.dateMvt);
    });

    return (
      <div className="kpi-dashboard">
        <div className="kpi-dashboard-header">
          <h3><i className="fas fa-table" /> Tableau</h3>
          <button
            className="kpi-dashboard-refresh"
            onClick={() => loadHistory()}
            title="Rafraîchir l'historique"
          >
            <i className="fas fa-rotate" />
          </button>
        </div>

        {isHistoryLoading ? (
          <div className="kpi-dashboard-empty">
            <p>Chargement de l'historique depuis la base…</p>
          </div>
        ) : historyError ? (
          <div className="kpi-dashboard-empty">
            <p>{historyError}</p>
          </div>
        ) : sheetEntries.depart.length === 0 && sheetEntries.mouvement.length === 0 ? (
          <div className="kpi-dashboard-empty">
            <p>Aucun tableau disponible</p>
          </div>
        ) : (
          <>
            <div className="kpi-dashboard-section">
              <h4><i className="fas fa-filter" /> Filtres</h4>
              <div className="kpi-filter-grid">
                <div className="kpi-filter-field">
                  <label htmlFor="tableau-fonction">Fonction :</label>
                  <input
                    id="tableau-fonction"
                    type="text"
                    placeholder="Rechercher par fonction…"
                    value={tableauFilters.fonction}
                    onChange={e => setTableauFilters(prev => ({ ...prev, fonction: e.target.value }))}
                  />
                </div>
                <div className="kpi-filter-field">
                  <label htmlFor="tableau-rattachement">Rattachement :</label>
                  <input
                    id="tableau-rattachement"
                    type="text"
                    placeholder="Rechercher par rattachement…"
                    value={tableauFilters.rattachement}
                    onChange={e => setTableauFilters(prev => ({ ...prev, rattachement: e.target.value }))}
                  />
                </div>
                <div className="kpi-filter-field">
                  <label htmlFor="tableau-date-from">Du :</label>
                  <input
                    id="tableau-date-from"
                    type="date"
                    value={tableauFilters.dateFrom}
                    onChange={e => setTableauFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
                  />
                </div>
                <div className="kpi-filter-field">
                  <label htmlFor="tableau-date-to">Au :</label>
                  <input
                    id="tableau-date-to"
                    type="date"
                    value={tableauFilters.dateTo}
                    onChange={e => setTableauFilters(prev => ({ ...prev, dateTo: e.target.value }))}
                  />
                </div>
                <div className="kpi-filter-field">
                  <label htmlFor="tableau-checking">Checking :</label>
                  <select
                    id="tableau-checking"
                    value={tableauFilters.checking}
                    onChange={e => setTableauFilters(prev => ({ ...prev, checking: e.target.value }))}
                  >
                    <option value="">Tous</option>
                    <option value="checked">Déjà traité</option>
                    <option value="unchecked">Non traité</option>
                  </select>
                </div>
              </div>
              <button
                className="kpi-filter-clear"
                onClick={() => setTableauFilters({ fonction: '', rattachement: '', dateFrom: '', dateTo: '', checking: '' })}
              >
                <i className="fas fa-times" /> Réinitialiser filtres
              </button>
            </div>

            <div className="kpi-dashboard-section">
              <h4><i className="fas fa-sign-out-alt" /> Tableau Départs ({filteredDepartRecords.length})</h4>
              {filteredDepartRecords.length === 0 ? (
                <p className="empty-text">Aucun départ ne correspond aux filtres</p>
              ) : (
                <div className="table-scroll">
                  <table className="kpi-table">
                    <thead>
                      <tr>
                        <th>Date insertion</th>
                        <th>Matricule</th>
                        <th>Nom</th>
                        <th>Fonction</th>
                        <th>Rattachement</th>
                        <th>Date départ</th>
                        <th>Motif</th>
                        <th>Raison</th>
                        <th>Checking</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredDepartRecords.map((record, idx) => (
                        <tr
                          key={record.id || `tableau-depart-${idx}`}
                          style={record.checking ? { backgroundColor: '#f0fdf4' } : undefined}
                        >
                          <td>{formatDate(record.timestamp)}</td>
                          <td>{record.matricule}</td>
                          <td>{record.nom}</td>
                          <td>{record.fonction}</td>
                          <td>{record.rattachement}</td>
                          <td>{formatDate(record.dateDepart)}</td>
                          <td>{record.motif}</td>
                          <td>{record.raison}</td>
                          <td>
                            <input
                              type="checkbox"
                              checked={Boolean(record.checking)}
                              disabled={Boolean(record.checking)}
                              title={record.checking ? 'Déjà traité, ligne figée' : 'Marquer comme traité'}
                              onChange={e => updateCheckingState('Départ', record.rowNumber, e.target.checked).catch(error => {
                                setHistoryError(error.message || 'Impossible de mettre à jour Checking');
                              })}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="kpi-dashboard-section">
              <h4><i className="fas fa-exchange-alt" /> Tableau Mouvements ({filteredMouvementRecords.length})</h4>
              {filteredMouvementRecords.length === 0 ? (
                <p className="empty-text">Aucun mouvement ne correspond aux filtres</p>
              ) : (
                <div className="table-scroll">
                  <table className="kpi-table">
                    <thead>
                      <tr>
                        <th>Date insertion</th>
                        <th>Matricule</th>
                        <th>Nom</th>
                        <th>Ancien poste</th>
                        <th>Date MVT</th>
                        <th>Nouveau poste</th>
                        <th>Type</th>
                        <th>Raison</th>
                        <th>Checking</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredMouvementRecords.map((record, idx) => (
                        <tr
                          key={record.id || `tableau-mvt-${idx}`}
                          style={record.checking ? { backgroundColor: '#f0fdf4' } : undefined}
                        >
                          <td>{formatDate(record.timestamp)}</td>
                          <td>{record.matricule}</td>
                          <td>{record.nom}</td>
                          <td>{record.ancienPoste}</td>
                          <td>{formatDate(record.dateMvt)}</td>
                          <td>{record.nouveauPoste}</td>
                          <td>{record.typeMvt}</td>
                          <td>{record.raisonMvt}</td>
                          <td>
                            <input
                              type="checkbox"
                              checked={Boolean(record.checking)}
                              disabled={Boolean(record.checking)}
                              title={record.checking ? 'Déjà traité, ligne figée' : 'Marquer comme traité'}
                              onChange={e => updateCheckingState('Mouvement', record.rowNumber, e.target.checked).catch(error => {
                                setHistoryError(error.message || 'Impossible de mettre à jour Checking');
                              })}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    );
  }

  const departEmployee = departForm.selectedEmployee;
  const mouvementEmployee = mouvementForm.selectedEmployee;

  return (
    <div className={sidebarCollapsed ? 'app-wrapper sidebar-collapsed' : 'app-wrapper'}>
      <div className={sidebarCollapsed ? 'sidebar collapsed' : 'sidebar'}>
        <div className="sidebar-header">
          <h1>Gestion RH</h1>
          <button className="toggle-btn" onClick={handleSidebarToggle}>
            <i className="fas fa-chevron-left" />
          </button>
        </div>

        <nav className="sidebar-nav">
        <button
          className={`nav-btn ${activeTab === 'depart' ? 'active' : ''}`}
          onClick={() => handleTabChange('depart')}
        >
          <i className="fas fa-sign-out-alt" />
          <span>Départ</span>
        </button>
        <button
          className={`nav-btn ${activeTab === 'mouvement' ? 'active' : ''}`}
          onClick={() => handleTabChange('mouvement')}
        >
          <i className="fas fa-exchange-alt" />
          <span>Mouvement</span>
        </button>
        <button
          className={`nav-btn ${activeTab === 'kpi' ? 'active' : ''}`}
          onClick={() => handleTabChange('kpi')}
        >
          <i className="fas fa-chart-bar" />
          <span>KPI</span>
        </button>
        <button
          className={`nav-btn ${activeTab === 'tableau' ? 'active' : ''}`}
          onClick={() => handleTabChange('tableau')}
        >
          <i className="fas fa-table" />
          <span>Tableau</span>
        </button>
        <button
          className={`nav-btn ${activeTab === 'ticket' ? 'active' : ''}`}
          onClick={() => handleTabChange('ticket')}
        >
          <i className="fas fa-ticket" />
          <span>Ticket</span>
        </button>
      </nav>
    </div>

    <div className="main-content">
      <div className="header">
        <h2>
          {activeTab === 'kpi'
            ? 'Tableau de bord KPI'
            : activeTab === 'tableau'
            ? 'Tableaux des collaborateurs'
            : activeTab === 'ticket'
            ? 'Création de ticket'
            : 'Mouvement de notre Collaborateur'}
        </h2>
      </div>

        <div className="form-wrapper">
          {renderStatusCard()}
          {activeTab === 'kpi' ? (
            <>
              {!isLoading && !loadError && dataLoaded && employes.length > 0 && renderKPIContent()}
            </>
          ) : activeTab === 'tableau' ? (
            <>
              {!isLoading && !loadError && dataLoaded && employes.length > 0 && renderTableauContent()}
            </>
          ) : activeTab === 'ticket' ? (
            <>
              {!isLoading && !loadError && dataLoaded && employes.length > 0 && renderTicketContent()}
            </>
          ) : !isLoading && !loadError && dataLoaded && employes.length > 0 && (
            <form onSubmit={activeTab === 'depart' ? handleSubmitDepart : handleSubmitMouvement}>
              <h3>
                {activeTab === 'depart' ? (
                  <>
                    <i className="fas fa-file-export" /> Formulaire de Départ
                  </>
                ) : (
                  <>
                    <i className="fas fa-arrows-rotate" /> Formulaire de Mouvement
                  </>
                )}
              </h3>

              <div className="form-grid">
                <div className="field-block">
                  <label htmlFor="hrbp">HRBP :</label>
                  <select
                    id="hrbp"
                    value={activeTab === 'depart' ? departForm.hrbp : mouvementForm.hrbp}
                    onChange={event =>
                      activeTab === 'depart'
                        ? handleDepartFieldChange('hrbp', event.target.value)
                        : handleMouvementFieldChange('hrbp', event.target.value)
                    }
                    required
                  >
                    <option value="">-- Choisir un HRBP --</option>
                    {HRBPS.map(name => (
                      <option key={name} value={name}>
                        {name}
                      </option>
                    ))}
                  </select>
                  {submitErrors.hrbp && <div className="error-text">{submitErrors.hrbp}</div>}
                </div>

                <div className="field-block">
                  <label>Sélectionner Employé :</label>
                  <div className="search-container">
                    <input
                      type="text"
                      className="search-input"
                      placeholder="Rechercher par matricule ou nom..."
                      value={activeTab === 'depart' ? departForm.employeeSearch : mouvementForm.employeeSearch}
                      onChange={event =>
                        activeTab === 'depart'
                          ? handleDepartFieldChange('employeeSearch', event.target.value)
                          : handleMouvementFieldChange('employeeSearch', event.target.value)
                      }
                    />
                    <div className={`employee-dropdown ${
                      (activeTab === 'depart' ? departSuggestions.length : mouvementSuggestions.length) > 0 ? '' : 'hidden'
                    }`}>
                      {(activeTab === 'depart' ? departSuggestions : mouvementSuggestions).map(emp => (
                        <div
                          key={`${emp.matricule}-${emp.nom}`}
                          className="employee-option"
                          onMouseDown={() =>
                            activeTab === 'depart'
                              ? selectDepartEmployee(emp)
                              : selectMouvementEmployee(emp)
                          }
                        >
                          {emp.matricule} - {emp.nom}
                        </div>
                      ))}
                    </div>
                  </div>
                  {submitErrors.employee && <div className="error-text">{submitErrors.employee}</div>}
                </div>

                <div className="field-block">
                  <label htmlFor="matricule">Matricule :</label>
                  <input id="matricule" value={activeTab === 'depart' ? departEmployee?.matricule || '' : mouvementEmployee?.matricule || ''} readOnly />
                </div>

                <div className="field-block">
                  <label htmlFor="nom">Nom et Prénoms :</label>
                  <input id="nom" value={activeTab === 'depart' ? departEmployee?.nom || '' : mouvementEmployee?.nom || ''} readOnly />
                </div>

                {activeTab === 'depart' ? (
                  <>
                    <div className="field-block">
                      <label htmlFor="fonction">Fonction :</label>
                      <input id="fonction" value={departEmployee?.fonction || ''} readOnly />
                    </div>

                    <div className="field-block">
                      <label htmlFor="statut">Statut :</label>
                      <input id="statut" value={departEmployee?.statut || ''} readOnly />
                    </div>

                    <div className="field-block">
                      <label htmlFor="rattachement">Rattachement :</label>
                      <input id="rattachement" value={departEmployee?.rattachement || ''} readOnly />
                    </div>

                    <div className="field-block">
                      <label htmlFor="dateIntegration">Date d'intégration :</label>
                      <input id="dateIntegration" value={formatDate(departEmployee?.dateIntegration) || ''} readOnly />
                    </div>

                    <div className="field-block">
                      <label htmlFor="login">Login :</label>
                      <input id="login" value={departEmployee?.login || ''} readOnly />
                    </div>

                    <div className="field-block">
                      <label htmlFor="mailConnecteo">Mail Connecteo :</label>
                      <input id="mailConnecteo" value={departEmployee?.mailConnecteo || ''} readOnly />
                    </div>

                    <div className="field-block">
                      <label htmlFor="dateDepart">Date de Départ :</label>
                      <input
                        type="date"
                        id="dateDepart"
                        value={departForm.dateDepart}
                        onChange={event => handleDepartFieldChange('dateDepart', event.target.value)}
                        required
                      />
                      {submitErrors.dateDepart && <div className="error-text">{submitErrors.dateDepart}</div>}
                    </div>

                    <div className="field-block">
                      <label htmlFor="motif">Motif de Départ :</label>
                      <select
                        id="motif"
                        value={departForm.motif}
                        onChange={event => handleDepartFieldChange('motif', event.target.value)}
                        required
                      >
                        <option value="">-- Choisir un motif --</option>
                        {MOTIFS_DEPART.map(motif => (
                          <option key={motif} value={motif}>
                            {motif}
                          </option>
                        ))}
                      </select>
                      {submitErrors.motif && <div className="error-text">{submitErrors.motif}</div>}
                    </div>

                    <div className="field-block field-full">
                      <label htmlFor="raison">
                        Raison <span style={{ color: 'red' }}>*</span>
                      </label>
                      <textarea
                        id="raison"
                        placeholder="Détails de la raison"
                        value={departForm.raison}
                        onChange={event => handleDepartFieldChange('raison', event.target.value)}
                      />
                      <div style={{ fontSize: 12, color: submitErrors.raison ? '#dc3545' : '#666', marginTop: 5 }}>
                        {submitErrors.raison ? submitErrors.raison : '* Obligatoire pour Démission et Licenciement'}
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="field-block">
                      <label htmlFor="ancienPoste">Ancien Poste :</label>
                      <input id="ancienPoste" value={mouvementEmployee?.fonction || ''} readOnly />
                    </div>

                    <div className="field-block">
                      <label htmlFor="dateMvt">Date du Mouvement :</label>
                      <input
                        type="date"
                        id="dateMvt"
                        value={mouvementForm.dateMvt}
                        onChange={event => handleMouvementFieldChange('dateMvt', event.target.value)}
                        required
                      />
                      {submitErrors.dateMvt && <div className="error-text">{submitErrors.dateMvt}</div>}
                    </div>

                    <div className="field-block">
                      <label htmlFor="typeMvt">Type de Mouvement :</label>
                      <select
                        id="typeMvt"
                        value={mouvementForm.typeMvt}
                        onChange={event => {
                          handleMouvementFieldChange('typeMvt', event.target.value);
                          handleMouvementFieldChange('nouvelleFonctionPersonnalisee', '');
                          handleMouvementFieldChange('isFonctionNouvelle', false);
                          handleMouvementFieldChange('nouvelleFonctionNom', '');
                          handleMouvementFieldChange('nouveauPoste', '');
                        }}
                        required
                      >
                        <option value="">-- Choisir un type --</option>
                        {TYPE_MOUVEMENT.map(typeMvt => (
                          <option key={typeMvt} value={typeMvt}>
                            {typeMvt}
                          </option>
                        ))}
                      </select>
                      {submitErrors.typeMvt && <div className="error-text">{submitErrors.typeMvt}</div>}
                    </div>

                    {mouvementForm.typeMvt === "Changement d'intitulé" ? (
                      <div className="field-block field-full">
                        <label htmlFor="nouvelleFonctionPersonnalisee">Nouvelle Fonction Personnalisée :</label>
                        <input
                          id="nouvelleFonctionPersonnalisee"
                          type="text"
                          placeholder="Entrez la nouvelle fonction..."
                          value={mouvementForm.nouvelleFonctionPersonnalisee}
                          onChange={event => handleMouvementFieldChange('nouvelleFonctionPersonnalisee', event.target.value)}
                          required
                        />
                        {submitErrors.nouvelleFonctionPersonnalisee && <div className="error-text">{submitErrors.nouvelleFonctionPersonnalisee}</div>}
                      </div>
                    ) : (
                      <>
                        <div className="field-block">
                          <label className="checkbox-label">
                            <input
                              type="checkbox"
                              checked={mouvementForm.isFonctionNouvelle}
                              onChange={event => {
                                handleMouvementFieldChange('isFonctionNouvelle', event.target.checked);
                                handleMouvementFieldChange('nouvelleFonctionNom', '');
                                handleMouvementFieldChange('nouveauPoste', '');
                              }}
                            />
                            C'est une nouvelle fonction
                          </label>
                        </div>

                        <div className="field-block">
                          {!mouvementForm.isFonctionNouvelle ? (
                            <>
                              <label htmlFor="nouveauPoste">Nouvelle Fonction :</label>
                              <select
                                id="nouveauPoste"
                                value={mouvementForm.nouveauPoste}
                                onChange={event => handleMouvementFieldChange('nouveauPoste', event.target.value)}
                                required
                              >
                                <option value="">-- Choisir une fonction --</option>
                                {mouvementPostes.map(fonction => (
                                  <option key={fonction} value={fonction}>
                                    {fonction}
                                  </option>
                                ))}
                              </select>
                              {submitErrors.nouveauPoste && <div className="error-text">{submitErrors.nouveauPoste}</div>}
                            </>
                          ) : (
                            <>
                              <label htmlFor="nouvelleFonctionNom">Entrez le nom de la nouvelle fonction :</label>
                              <input
                                id="nouvelleFonctionNom"
                                type="text"
                                placeholder="Entrez nouvelle fonction..."
                                value={mouvementForm.nouvelleFonctionNom}
                                onChange={event => handleMouvementFieldChange('nouvelleFonctionNom', event.target.value)}
                                required
                              />
                              {submitErrors.nouvelleFonctionNom && <div className="error-text">{submitErrors.nouvelleFonctionNom}</div>}
                            </>
                          )}
                        </div>
                      </>
                    )}

                    <div className="field-block field-full">
                      <label htmlFor="raisonMvt">Raison du Mouvement :</label>
                      <textarea
                        id="raisonMvt"
                        placeholder="Détails de la raison"
                        value={mouvementForm.raisonMvt}
                        onChange={event => handleMouvementFieldChange('raisonMvt', event.target.value)}
                      />
                    </div>
                  </>
                )}
              </div>

              <div className="form-footer">
                <button type="submit">
                  <i className="fas fa-paper-plane" /> Envoyer
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {successMessage && <div className="success-message">{successMessage}</div>}
    </div>
  );
}

export default App;
