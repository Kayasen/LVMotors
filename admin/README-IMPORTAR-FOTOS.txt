LVMOTORS - Importar fotos remotas

1. Subir o site para o cPanel.
2. Garantir permissões de escrita em assets/img/stock e data/cars.js.
3. Abrir /admin/import-remote-images.php.
4. Inserir a password do painel.
5. O script descarrega os links externos, comprime para WEBP/JPG e atualiza data/cars.js para caminhos locais.
6. É criado backup automático em data/cars.backup-YYYYMMDD-HHMMSS.js.
7. Depois de confirmar que está tudo certo, pode apagar admin/import-remote-images.php.

Compressão usada: máximo 1920x1440, WEBP qualidade 82 ou JPG qualidade 86 se o servidor não tiver WebP.
