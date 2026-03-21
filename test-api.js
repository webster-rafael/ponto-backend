const companyId = 'd290f1ee-6c54-4b01-90e6-d701748f0851'; // Genial Segurança UUID

async function testBackend() {
    const baseUrl = 'http://localhost:3333';
    console.log('🧪 Iniciando testes do backend...\n');

    // 1. Fetch Companies
    console.log('1️⃣  Testando GET /companies...');
    const companiesRes = await fetch(`${baseUrl}/companies`);
    const companiesData = await companiesRes.json();
    console.log(`   Status: ${companiesRes.status}`);
    console.log(`   Empresas encontradas: ${companiesData.companies.length}`);
    if (companiesData.companies.length === 0) throw new Error('Falha ao buscar empresas');

    // 2. Register
    const email = `test_${Date.now()}@example.com`;
    console.log(`\n2️⃣  Testando POST /users (Cadastro) para ${email}...`);

    const registerRes = await fetch(`${baseUrl}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            name: 'Test Integrado',
            email,
            password: 'password123',
            companyId
        })
    });
    console.log(`   Status: ${registerRes.status}`);
    if (registerRes.status !== 201) {
        const err = await registerRes.text();
        console.error('   Erro:', err);
        throw new Error('Falha no cadastro');
    }

    // 3. Login
    console.log('\n3️⃣  Testando POST /sessions (Login)...');
    const loginRes = await fetch(`${baseUrl}/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            email,
            password: 'password123',
            companyId
        })
    });
    const loginData = await loginRes.json();
    console.log(`   Status: ${loginRes.status}`);

    if (loginRes.status === 200 && loginData.token) {
        console.log('   ✅ Token recebido com sucesso!');
    } else {
        console.error('   Erro:', loginData);
        throw new Error('Falha no login');
    }

    console.log('\n✅ TODOS OS TESTES PASSARAM!');
}

testBackend().catch(err => console.error('\n❌ TESTES FALHARAM:', err.message));
