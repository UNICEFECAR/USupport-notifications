ENV=$1
REDEPLOY=$2

if [ "$ENV" != 'staging' ] && [ "$ENV" != 'prod' ]
then    
    echo "Please select deployment environment: staging | prod"
fi

if [ "$REDEPLOY" = 'deploy' ] || [ "$REDEPLOY" = 'redeploy' ]
then
    IMAGE_TAG=beta
    if [ "$ENV" = 'staging' ]
    then    
        IMAGE_TAG=beta
    elif [ "$ENV" = 'prod' ]
    then 
        IMAGE_TAG=latest
    fi

    # Build docker image of the service locally
    docker build -t notifications:$IMAGE_TAG .
    docker tag notifications:$IMAGE_TAG 482053628475.dkr.ecr.eu-central-1.amazonaws.com/usupport-notifications-api:$IMAGE_TAG

    # Push image to 
    docker push 482053628475.dkr.ecr.eu-central-1.amazonaws.com/usupport-notifications-api:$IMAGE_TAG

    cd kube-config
    
    kubectl apply -f config.yaml

    cd $ENV

    if [ "$REDEPLOY" = 'deploy' ]
    then
        # Update Kuberenetes Cluster applications for this API service
        kubectl apply -f secrets.yaml -f deployment.yaml
    elif [ "$REDEPLOY" = 'redeploy' ]
    then 
        kubectl apply -f secrets.yaml
        kubectl rollout restart deployment notifications
    fi

    cd ..
    kubectl apply -f service.yaml

else
    echo "Please select either to deploy or redeploy k8s pod"
fi
