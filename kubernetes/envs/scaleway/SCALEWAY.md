# Scaleway

## Redeploy rnode on scaleway

The idea is to drop existing rnode statefulset and their persistent volume and recreate them.

```sh
cd kubernetes/envs/<CLOUD_PROVIDER>/<NAMESPACE>

# Delete existing rnode stafulset and associated pvc and pv
kubectl delete statefulsets.apps rnode --wait
# Wait until statefulset pods rnodes are deleted, use `kubectl get pods` to know if rnode pods are fully deleted

# Delete rnode pvc by executing `kubectl get pvc` and `kubectl delete pvc <RNODE_PVC_NAME>`
#For example, on Scaleway only, to drop pvc used by rnode-0, execute folloowing command
kubectl delete pvc csi-vol-scw-rnode-0

# Redeploy rnode
kubectl apply -k ./kubernetes/envs/<CLOUD_PROVIDER>/gamma/rnode
```