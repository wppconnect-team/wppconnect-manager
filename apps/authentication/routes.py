# -*- encoding: utf-8 -*-
"""
Copyright (c) 2019 - present AppSeed.us
"""

from flask import jsonify, render_template, redirect, request, url_for
import requests
import json
from flask_login import (
    current_user,
    login_user,
    login_required,
    logout_user
)

from flask_dance.contrib.github import github

from apps import db, login_manager
from apps.authentication import blueprint
from apps.authentication.forms import LoginForm, CreateAccountForm, CreateInstanceForm
from apps.authentication.models import Users, Instance

from apps.authentication.util import verify_pass

@blueprint.route('/')
def route_default():
    return redirect(url_for('authentication_blueprint.login'))

# Login & Registration

@blueprint.route("/github")
def login_github():
    """ Github login """
    if not github.authorized:
        return redirect(url_for("github.login"))

    res = github.get("/user")
    return redirect(url_for('home_blueprint.index'))

@blueprint.route('/login', methods=['GET', 'POST'])
def login():
    login_form = LoginForm(request.form)
    if 'login' in request.form:

        # read form data
        username = request.form['username']
        password = request.form['password']

        # Locate user
        user = Users.query.filter_by(username=username).first()

        # Check the password
        if user and verify_pass(password, user.password):
            login_user(user)
            return redirect(url_for('authentication_blueprint.route_default'))

        # Something (user or pass) is not ok
        return render_template('accounts/login.html',
                               msg='Wrong user or password',
                               form=login_form)

    if not current_user.is_authenticated:
        return render_template('accounts/login.html',
                               form=login_form)
    return redirect(url_for('home_blueprint.index'))


@blueprint.route('/register', methods=['GET', 'POST'])
def register():
    create_account_form = CreateAccountForm(request.form)
    if 'register' in request.form:

        username = request.form['username']
        email = request.form['email']

        # Check username exists
        user = Users.query.filter_by(username=username).first()
        if user:
            return render_template('accounts/register.html',
                                   msg='Username already registered',
                                   success=False,
                                   form=create_account_form)

        # Check email exists
        user = Users.query.filter_by(email=email).first()
        if user:
            return render_template('accounts/register.html',
                                   msg='Email already registered',
                                   success=False,
                                   form=create_account_form)

        # else we can create the user
        user = Users(**request.form)
        db.session.add(user)
        db.session.commit()

        # Delete user from session
        logout_user()
        
        return render_template('accounts/register.html',
                               msg='Account created successfully.',
                               success=True,
                               form=create_account_form)

    else:
        return render_template('accounts/register.html', form=create_account_form)
    

## Instance Start

@blueprint.route('/transactions', methods=['GET'])
@login_required
def list_instances():
    instances = Instance.query.all()  # Obtém todos os registros da tabela Instance
    return render_template('home/transactions.html', instances=instances)


@blueprint.route('/instance', methods=['GET', 'POST'])
def create_instance():
    create_instance_form = CreateInstanceForm()
    if request.method == 'POST':
        instance_name = request.form.get('instance_name')
        token = request.form.get('token')
        webhook = request.form.get('webhook')
        typebot = request.form.get('typebot')
        dify = request.form.get('dify')

        if not instance_name:
            return render_template('home/instance.html',
                                   msg='Instance name is required',
                                   success=False,
                                   form=create_instance_form)

        # Check if instance already exists
        instance = Instance.query.filter_by(instance_name=instance_name).first()
        if instance:
            return render_template('home/instance.html',
                                   msg='Instance already exists',
                                   success=False,
                                   form=create_instance_form)

        url = f"http://localhost:21465/api/{instance_name}/THISISMYSECURETOKEN/generate-token"

        payload = {}
        headers = {
            'Authorization': 'Bearer $2b$10$q6Jwh6aOga0aBenf.KmxLu_v9o95UpoqVann_Kjc_6x7KpFx3fI52'
        }

        try:
            response = requests.post(url, headers=headers, data=payload)
            response.raise_for_status()  # Raises an error for bad status codes

            # Parse o JSON da resposta
            data = response.json()

            # Extraia o token
            token = data.get('token')
            # Create the new instance
            new_instance = Instance(
                instance_name=instance_name,
                token=token,
                webhook=webhook,
                typebot=typebot,
                dify=dify
            )
            db.session.add(new_instance)
            db.session.commit()

            # Exiba o token
            print(token)
        except requests.exceptions.RequestException as e:
            return render_template('home/instance.html',
                                   msg=f'Error while generating token: {e}',
                                   success=False,
                                   form=create_instance_form)
        except json.JSONDecodeError:
            return render_template('home/instance.html',
                                   msg='Error parsing the response JSON',
                                   success=False,
                                   form=create_instance_form)

        return render_template('home/instance.html',
                               msg='Instance created successfully.',
                               success=True,
                               form=create_instance_form)

    return render_template('home/instance.html', form=create_instance_form)


@blueprint.route('/api/get-token/<instance_name>', methods=['GET'])
def get_token(instance_name):
    instance = Instance.query.filter_by(instance_name=instance_name).first()
    if instance:
        return jsonify({'token': instance.token})
    else:
        return jsonify({'error': 'Instance not found'}), 404




@blueprint.route('/qrcode-status/<string:instance_name>', methods=['GET'])
def qrcode_status(instance_name):
    instance = Instance.query.filter_by(instance_name=instance_name).first()
    if not instance:
        return jsonify({'error': 'Instance not found'}), 404

    return jsonify({'qrcode': instance.qrcode, 'status': 'completed' if instance.qrcode else 'pending'})

@blueprint.route('/logout')
def logout():
    logout_user()
    return redirect(url_for('authentication_blueprint.login'))


# Errors

@login_manager.unauthorized_handler
def unauthorized_handler():
    return render_template('home/page-403.html'), 403


@blueprint.errorhandler(403)
def access_forbidden(error):
    return render_template('home/page-403.html'), 403


@blueprint.errorhandler(404)
def not_found_error(error):
    return render_template('home/page-404.html'), 404


@blueprint.errorhandler(500)
def internal_error(error):
    return render_template('home/page-500.html'), 500

# Função placeholder para instance_user, precisa ser substituída pela implementação real
def instance_user():
    pass
