

## Plan : Améliorer le planning ménage (message à copier-coller)

### Problème actuel

Le message est organisé par **créneau de ménage** (chaque départ génère un bloc). C'est confus car les arrivées et départs sont mélangés dans un même bloc. Le format n'est pas chronologique jour par jour.

### Nouveau format proposé

Un planning **jour par jour**, listant clairement chaque événement (départ ou arrivée) pour chaque jour du mois où il se passe quelque chose :

```text
🧹 PLANNING MÉNAGE — AVRIL 2026
════════════════════════════════

📅 SAMEDI 4 AVRIL

  🏠 Appartement Mer
  🚪 DÉPART — Jean Dupont — 🕐 10:00
  🧹 Ménage à faire

  🏠 Appartement Mer
  🔑 ARRIVÉE — Marie Martin — 🕐 16:00 — 📞 0612345678 — 7 nuits

  ────────────────────────────

📅 LUNDI 6 AVRIL

  🏠 Studio Plage
  🚪 DÉPART — Pierre Leroy — 🕐 10:00
  ✅ Pas d'arrivée prévue ensuite

  ────────────────────────────

📅 MERCREDI 8 AVRIL

  🏠 Studio Plage
  🔒 FIN BLOCAGE — Travaux
  🧹 Ménage à faire

  🏠 Studio Plage
  🔑 ARRIVÉE — Sophie Blanc — 🕐 15:00 — 📞 0698765432 — 3 nuits
```

### Changements techniques

**Fichier modifié** : `src/components/host/HostCleaning.tsx`

- Réécrire `generateFullMessage()` et `generatePerStaffMessage()` pour :
  1. Collecter tous les événements du mois (départs + arrivées) avec leurs détails
  2. Les grouper par date
  3. Pour chaque jour, lister chronologiquement :
     - **Départs** : nom du locataire, heure de départ, mention "Ménage à faire"
     - **Arrivées** : nom du locataire, heure d'arrivée, téléphone, nombre de nuits
     - **Blocages** : "Fin blocage" / "Début blocage" avec raison
  4. Ajouter les indicateurs d'urgence (⚠️ si enchaînement serré)

- Les fonctions `buildSlotText()` et `buildSlotTextCompact()` seront remplacées par une logique basée sur les événements plutôt que sur les slots de ménage

