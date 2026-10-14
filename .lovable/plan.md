# Lien de planning pour une femme de ménage externe

## Ce que vous obtenez
Dans l'onglet Ménage, un nouveau bloc « Liens externes » permet de créer un lien privé pour une personne extérieure, en plus de l'équipe actuelle (rien ne change pour elle : ses appartements et son portail restent les mêmes).

Pour chaque lien externe, vous choisissez :
- un nom (ex. « Marie – remplaçante ») et un téléphone facultatif ;
- les appartements visibles : **tous** ou une sélection ;
- la période visible (mois passés / mois à venir), comme pour l'équipe ;
- l'affichage ou non du nom et du téléphone des locataires.

La personne ouvre le lien (sans compte) et voit le même planning que l'équipe : périodes louées, nom du locataire, dates et heures d'arrivée et de départ, blocages, rotations serrées. Aucun montant n'est jamais affiché.

Actions disponibles : copier le lien, l'envoyer par WhatsApp, le modifier, le désactiver ou le supprimer (le lien cesse alors de fonctionner immédiatement).

## Détails techniques
- Table `cleaning_staff` : ajout de `is_external boolean default false`, `all_listings boolean default false`, `show_tenant_names boolean default true`, `is_active boolean default true` (colonnes additives).
- Les membres externes sont exclus de la carte « appartement → femme de ménage » de HostCleaning, donc aucune attribution existante n'est remplacée ; leurs appartements passent par `cleaning_staff_listings` (ou `all_listings`).
- `get_cleaning_portal_data` : si `all_listings`, prendre tous les appartements de l'hôte ; si `show_tenant_names = false`, renvoyer « Locataire » sans téléphone ; refuser si `is_active = false`.
- Le portail /cleaning-portal existant est réutilisé tel quel.
