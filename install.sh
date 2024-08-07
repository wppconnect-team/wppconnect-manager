!/bin/bash
#script configure wppconnect-server with ssl
whiptail --title "Instalação WPPConnect-Server" --msgbox "Aperte ENTER para iniciar a instalação do Wppconnect-Server com SSL" --fb 10 50
sudo apt update -y

sudo apt install -y wget zip
sudo apt install -y nginx
sudo apt install -y certbot python3-certbot-nginx

sudo rm /etc/nginx/sites-enabled/default


   dominioServer=$(whiptail --title "Dominio para o servidor de API" --inputbox "Digite o dominio da API:" --fb 10 60 3>&1 1>&2 2>&3)
   sudo echo 'server {
   server_name '$dominioServer';

  location / {
    proxy_pass http://127.0.0.1:21465;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_cache_bypass $http_upgrade;
  }
}' >> /etc/nginx/sites-available/wppconnet-server

sudo ln -s /etc/nginx/sites-available/wppconnect-server /etc/nginx/sites-enabled

service nginx restart
certbot -d $dominioServer
certbot -d $dominioMonitor
service nginx restart