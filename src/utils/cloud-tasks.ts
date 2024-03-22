import { CloudTasksClient } from '@google-cloud/tasks'

const client = new CloudTasksClient()

export const sendCloudTask = async (endpoint: string, data: unknown, httpMethod: 'POST' | 'PUT') => {
    const project = process.env.GCP_PROJECT_ID || ''
    const queue = process.env.MESSAGE_QUEUE_NAME || ''
    const location = process.env.MESSAGE_QUEUE_REGION || ''

    const parent = client.queuePath(project, location, queue)
    const task = getTask(`${process.env.ULTMT_API_URL}${endpoint}`, data, httpMethod)
    const request = getRequest(parent, task)
    const response = await client.createTask(request as any)

    return response
}

const getTask = (url: string, data: unknown, httpMethod: 'POST' | 'PUT' | 'DELETE'): unknown => {
    const serviceAccountEmail = process.env.GCP_SERVICE_ACCOUNT
    return {
        httpRequest: {
            httpMethod: httpMethod,
            url,
            body: Buffer.from(JSON.stringify(data)).toString('base64'),
            headers: {
                'Content-Type': 'application/json',
                'X-API-Key': process.env.API_KEY,
            },
            oidcToken: {
                serviceAccountEmail,
            },
        },
    }
}

const getRequest = (parent: string, task: unknown) => {
    return {
        parent,
        task,
    }
}
