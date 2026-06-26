LVMOTORS - Upload e compressão de fotos

As fotos dos carros são carregadas pelo painel em /admin/painel.html.

O ficheiro admin/upload-images.php:
- aceita JPG, PNG e WEBP;
- redimensiona para máximo 1920x1440;
- converte para WEBP com qualidade 82 quando o servidor suporta WebP;
- se WebP não estiver disponível, guarda em JPG qualidade 86;
- guarda tudo em assets/img/stock/;
- devolve ao painel os caminhos finais das imagens.

Para funcionar no cPanel:
1. Abrir o painel pelo domínio, não por file:///C:/...
2. Ter PHP ativo.
3. Ter extensão GD ativa no PHP.
4. Garantir permissões de escrita em:
   - data/cars.js
   - data/backups/
   - assets/img/stock/

Com 1GB no alojamento, a recomendação é não subir fotos acima de 1920px para o site.
Mesmo que subas fotos grandes, o PHP tenta comprimir automaticamente.
