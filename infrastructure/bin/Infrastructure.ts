#!/usr/bin/env node
import 'source-map-support/register';
import { App } from 'aws-cdk-lib'
import { Cognito } from '../lib/Cognito';
import { Infrastructure } from '../lib/Infrastructure';

const app = new App();
const infra = new Infrastructure(app, 'pomitrackerinfra');
const cognito = new Cognito(infra);