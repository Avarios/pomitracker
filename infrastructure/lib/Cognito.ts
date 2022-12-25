import { Construct } from 'constructs';
import { CfnOutput, CfnParameter, Duration, RemovalPolicy, Stack } from 'aws-cdk-lib';
import {
    AccountRecovery, Mfa, OAuthScope, ProviderAttribute, UserPool,
    UserPoolClientIdentityProvider,
    UserPoolEmail, UserPoolIdentityProviderGoogle, VerificationEmailStyle
} from 'aws-cdk-lib/aws-cognito';
import { AwsCustomResource, AwsCustomResourcePolicy, PhysicalResourceId } from 'aws-cdk-lib/custom-resources';
export class Cognito extends Construct {
    constructor(parent: Stack) {
        super(parent, 'PomiTrackerCognito');
        const googleClientId = new CfnParameter(parent, 'googleClientId', {
            type: "String",
            description: "Enter the Google Client Id for the Cognito Connection"
        }).valueAsString;

        const googleClientSecret = new CfnParameter(parent, 'googleClientSecret', {
            type: "String",
            description: "Enter the Google Client Secret for the Cognito Connection"
        }).valueAsString;

        const cognitoDomain = new CfnParameter(parent, 'cognitoDomain', {
            type: "String",
            description: "Domain Prefix for Cognito"
        }).valueAsString;

        const cognitoSenderMail = new CfnParameter(parent, 'cognitoSenderMail', {
            type: "String",
            description: "The Sendermail for Cognito for Password Reset etc."
        }).valueAsString;

        const redirectUri = new CfnParameter(parent, 'redirectUri', {
            type: "String",
            description: "Specify the URL to your callback in the webapp"
        }).valueAsString;

        const userPool = new UserPool(parent, 'PomiTrackerUserPool', {
            accountRecovery: AccountRecovery.EMAIL_ONLY,
            mfa: Mfa.OPTIONAL,
            passwordPolicy: {
                minLength: 8,
                requireSymbols: true,
                requireDigits: true,
                requireLowercase: true,
                requireUppercase: true,
                tempPasswordValidity: Duration.days(1)
            },
            email: UserPoolEmail.withCognito(cognitoSenderMail),
            selfSignUpEnabled: true,
            userVerification: {
                emailSubject: 'Verify your email for PomiTracker !',
                emailBody: 'Thanks for signing up to PomiTracker! Your verification code is {####}',
                emailStyle: VerificationEmailStyle.CODE
            },
            signInAliases: {
                email: true
            },
            userPoolName: "PomiTrackerUserPool",
            standardAttributes: {
                email: {
                    mutable: true,
                    required: true
                }
            },
            mfaSecondFactor: {
                otp: true,
                sms: false
            },
            removalPolicy: RemovalPolicy.DESTROY
        });

        const googleProvider = new UserPoolIdentityProviderGoogle(parent, 'googleProvider', {
            clientId: googleClientId,
            clientSecret: googleClientSecret,
            userPool,
            scopes: [
                "openid", "email" , "profile"
            ],
            attributeMapping: {
                email: ProviderAttribute.GOOGLE_EMAIL,
                givenName: ProviderAttribute.GOOGLE_GIVEN_NAME,
                profilePicture: ProviderAttribute.GOOGLE_PICTURE,
                familyName: ProviderAttribute.GOOGLE_FAMILY_NAME,
                preferredUsername:ProviderAttribute.GOOGLE_NAME
            },
        });
        googleProvider.applyRemovalPolicy(RemovalPolicy.DESTROY);
        userPool.identityProviders.push(googleProvider);

        const appClient = userPool.addClient('webClientPomiTracker', {
            accessTokenValidity: Duration.days(1),
            idTokenValidity: Duration.days(1),
            generateSecret: true,
            refreshTokenValidity: Duration.days(1),
            oAuth: {
                callbackUrls: [
                    redirectUri
                ],
                flows: {
                    authorizationCodeGrant: true
                },
                scopes: [OAuthScope.EMAIL, OAuthScope.OPENID, OAuthScope.PROFILE]
            },
            supportedIdentityProviders: [
                UserPoolClientIdentityProvider.GOOGLE,
                UserPoolClientIdentityProvider.COGNITO
            ]
        });
        appClient.applyRemovalPolicy(RemovalPolicy.DESTROY);
        appClient.node.addDependency(googleProvider);


        const userPoolDomain = userPool.addDomain('PomiTrackerUserPoolDomain', {
            cognitoDomain: {
                domainPrefix: cognitoDomain
            }
        });

        userPoolDomain.signInUrl(appClient, { redirectUri: redirectUri })

        // Create Custom Ressource just to get the ClientSecret.
        const describeCognitoUserPoolClient = new AwsCustomResource(
            this,
            'DescribeCognitoUserPoolClient',
            {
                resourceType: 'Custom::DescribeCognitoUserPoolClient',
                onCreate: {
                    region: parent.region,
                    service: 'CognitoIdentityServiceProvider',
                    action: 'describeUserPoolClient',
                    parameters: {
                        UserPoolId: userPool.userPoolId,
                        ClientId: appClient.userPoolClientId,
                    },
                    physicalResourceId: PhysicalResourceId.of(appClient.userPoolClientId),
                },
                policy: AwsCustomResourcePolicy.fromSdkCalls({
                    resources: AwsCustomResourcePolicy.ANY_RESOURCE,
                }),
            }
        )

        const userPoolClientSecret = describeCognitoUserPoolClient.getResponseField(
            'UserPoolClient.ClientSecret'
        )

        new CfnOutput(parent, 'PomiTrackerClientUserPoolID', {
            value: userPool.userPoolId,
            description: 'The user pool id',
        });

        new CfnOutput(parent, 'PomiTrackerCognitoUrl', {
            value: `${userPoolDomain.domainName}.auth.${parent.region}.amazoncognito.com/oauth2/authorize?client_id=${appClient.userPoolClientId}&response_type=code&scope=email+openid+profile&redirect_uri=${redirectUri}`,
            description: 'Domain Name Congito',
        });

        new CfnOutput(parent, 'ClientId', {
            value: appClient.userPoolClientId,
            description: 'Domain Name Congito',
        });

        new CfnOutput(this, 'UserPoolClientSecret', {
            value: userPoolClientSecret,
        }) 
    }
}