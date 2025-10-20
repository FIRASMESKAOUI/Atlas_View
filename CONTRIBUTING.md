# Guide de Contribution

Merci de votre intérêt à contribuer au projet Carthago Market ! Voici quelques lignes directrices pour vous aider à contribuer efficacement.

## Comment contribuer

1. **Fork** le dépôt sur GitHub
2. **Clone** votre fork localement
   ```bash
   git clone https://github.com/votre-username/Carthago-Market.git
   cd Carthago-Market
   ```
3. **Créez une branche** pour votre fonctionnalité ou correction
   ```bash
   git checkout -b ma-nouvelle-fonctionnalite
   ```
4. **Développez** votre fonctionnalité ou correction
5. **Testez** vos changements
6. **Committez** vos changements avec des messages clairs
   ```bash
   git commit -m "Description claire de vos changements"
   ```
7. **Poussez** votre branche vers votre fork
   ```bash
   git push origin ma-nouvelle-fonctionnalite
   ```
8. Créez une **Pull Request** vers le dépôt principal

## Configuration de l'environnement de développement

1. Créez et activez un environnement virtuel Python
   ```bash
   python -m venv venv
   source venv/bin/activate  # Linux/Mac
   # ou
   venv\Scripts\activate     # Windows
   ```

2. Installez les dépendances
   ```bash
   pip install -r requirements.txt
   ```

3. Configurez votre fichier `.env` en utilisant `.env.example` comme modèle
   ```bash
   cp .env.example .env
   # Éditez ensuite le fichier .env avec vos informations
   ```

4. Lancez l'application en mode développement
   ```bash
   python -m src.main
   ```

## Normes de codage

- Suivez les standards PEP 8 pour le code Python
- Utilisez des docstrings pour documenter les fonctions et les classes
- Commentez votre code lorsque nécessaire
- Écrivez des tests unitaires pour les nouvelles fonctionnalités

## Structure du projet

- `src/` : Code source principal
  - `database/` : Connexion et modèles de base de données
  - `routes/` : Routes API Flask
  - `services/` : Services métier
  - `static/` : Fichiers statiques (HTML, CSS, JS)
- `models_cache/` : Cache pour les modèles d'IA
- `scripts/` : Scripts utilitaires

## Signaler des bugs

Si vous trouvez un bug, veuillez ouvrir une issue sur GitHub avec les informations suivantes :

- Description claire et concise du bug
- Étapes pour reproduire le problème
- Comportement attendu
- Captures d'écran si applicable
- Environnement (système d'exploitation, version de Python, etc.)

## Proposer des fonctionnalités

Si vous avez une idée pour une nouvelle fonctionnalité, ouvrez une issue pour en discuter avant de commencer le développement.
