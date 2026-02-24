# 📱 Guide d'Intégration Mobile - EV Charge Guinée

Documentation complète pour intégrer l'application mobile Android/iOS avec le backend.

---

## 🎯 Vue d'Ensemble

L'application mobile communique avec le backend via une API REST JSON.
```
┌─────────────────────────────────────┐
│     Mobile App (Kotlin/Swift)      │
│                                     │
│  ┌───────────────────────────────┐ │
│  │   QR Code Scanner             │ │
│  │   Leaflet Map                 │ │
│  │   HTTP Client (Retrofit/Ktor) │ │
│  │   Secure Storage              │ │
│  │   Deep Links                  │ │
│  └───────────────────────────────┘ │
└─────────────┬───────────────────────┘
              │ HTTPS/JSON
              │
              ▼
┌─────────────────────────────────────┐
│    Backend API (NestJS)             │
│    https://api.evcharge.gn          │
└─────────────────────────────────────┘
```

---

## 🔐 Authentication Flow

### 1. Register

**Endpoint:** `POST /auth/register`

**Request:**
```kotlin
// Kotlin Example
data class RegisterRequest(
    val email: String,
    val password: String,
    val firstName: String,
    val lastName: String,
    val phone: String
)

val request = RegisterRequest(
    email = "user@example.com",
    password = "Password123!",
    firstName = "Mamadou",
    lastName = "Diallo",
    phone = "+224621234567"
)

api.register(request)
```

**Response:**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "firstName": "Mamadou",
    "lastName": "Diallo",
    "role": "USER"
  },
  "accessToken": "eyJhbGci...",
  "refreshToken": "eyJhbGci..."
}
```

**Action:**
```kotlin
// Sauvegarder les tokens
secureStorage.saveAccessToken(response.accessToken)
secureStorage.saveRefreshToken(response.refreshToken)
secureStorage.saveUserId(response.user.id)

// Rediriger vers la Home
navigator.navigateToHome()
```

---

### 2. Login

**Endpoint:** `POST /auth/login`

**Request (Email OU Phone):**
```kotlin
// Option 1: Email
data class LoginRequest(
    val email: String? = null,
    val phone: String? = null,
    val password: String
)

val request = LoginRequest(
    email = "user@example.com",
    password = "Password123!"
)

// Option 2: Phone
val requestPhone = LoginRequest(
    phone = "+224621234567",
    password = "Password123!"
)

api.login(request)
```

**Response:** Identique à Register

---

### 3. Auto-Login avec Token

**Lors du démarrage de l'app:**
```kotlin
// Au lancement
suspend fun checkAuth() {
    val token = secureStorage.getAccessToken()
    
    if (token != null) {
        try {
            // Vérifier que le token est valide
            val user = api.getMe()
            
            // Token valide → Aller à Home
            navigator.navigateToHome()
        } catch (e: UnauthorizedException) {
            // Token expiré → Essayer de refresh
            tryRefreshToken()
        }
    } else {
        // Pas de token → Login screen
        navigator.navigateToLogin()
    }
}
```

---

### 4. Refresh Token

**Endpoint:** `POST /auth/refresh`
```kotlin
suspend fun tryRefreshToken() {
    val refreshToken = secureStorage.getRefreshToken()
    
    if (refreshToken != null) {
        try {
            val response = api.refreshToken(refreshToken)
            
            // Sauvegarder les nouveaux tokens
            secureStorage.saveAccessToken(response.accessToken)
            secureStorage.saveRefreshToken(response.refreshToken)
            
            // Continuer
            navigator.navigateToHome()
        } catch (e: Exception) {
            // Refresh failed → Logout
            logout()
        }
    } else {
        logout()
    }
}
```

---

## 📱 Flux Complet : Scan QR → Paiement

### Étape 1 : Scanner QR Code

**Utiliser une bibliothèque QR :**
```kotlin
// Kotlin - ML Kit Barcode Scanner
import com.google.mlkit.vision.barcode.BarcodeScanning

fun startQRScanner() {
    val scanner = BarcodeScanning.getClient()
    
    // Analyser l'image
    scanner.process(image)
        .addOnSuccessListener { barcodes ->
            for (barcode in barcodes) {
                val qrContent = barcode.rawValue
                
                // Décoder le JSON du QR
                val qrData = parseQRCode(qrContent)
                
                if (qrData.type == "EV_CHARGING_STATION") {
                    // Appeler l'API
                    scanStation(qrData.qrCode)
                }
            }
        }
}

fun parseQRCode(content: String): QRCodeData {
    return Json.decodeFromString(content)
}

data class QRCodeData(
    val type: String,
    val qrCode: String,
    val app: String,
    val version: String,
    val timestamp: String
)
```

---

### Étape 2 : Récupérer Station + Offres

**Endpoint:** `GET /stations/scan/qr/{qrCode}`
```kotlin
suspend fun scanStation(qrCode: String) {
    val response = api.scanQR(qrCode)
    
    // Response contient:
    // - station (détails de la borne)
    // - offers (3 offres: Rapide, Standard, Complète)
    // - quickActions (stationId, connectorId)
    
    // Afficher l'écran de sélection d'offre
    navigator.navigateToOfferSelection(response)
}

// API Call
@GET("stations/scan/qr/{qrCode}")
suspend fun scanQR(
    @Path("qrCode") qrCode: String
): ScanQRResponse

data class ScanQRResponse(
    val station: Station,
    val offers: List<Offer>,
    val message: String,
    val quickActions: QuickActions
)

data class Station(
    val id: String,
    val name: String,
    val address: String,
    val status: String,
    val power: Double,
    val pricePerKwh: Int,
    val amenities: List<String>
)

data class Offer(
    val id: String,
    val name: String,
    val type: String,  // QUICK, STANDARD, FULL
    val duration: Int,
    val power: Double,
    val price: Int,
    val pricePerKwh: Int,
    val description: String
)
```

---

### Étape 3 : Afficher les Offres (UI)
```kotlin
@Composable
fun OfferSelectionScreen(
    station: Station,
    offers: List<Offer>,
    onOfferSelected: (Offer) -> Unit
) {
    Column(modifier = Modifier.fillMaxSize()) {
        // Station Info
        StationCard(station)
        
        Spacer(modifier = Modifier.height(16.dp))
        
        Text("Sélectionnez votre offre")
        
        // Offres
        offers.forEach { offer ->
            OfferCard(
                offer = offer,
                onClick = { onOfferSelected(offer) }
            )
        }
    }
}

@Composable
fun OfferCard(offer: Offer, onClick: () -> Unit) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onClick() }
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Text(offer.name, style = MaterialTheme.typography.h6)
            Text("${offer.duration} minutes")
            Text("${offer.price} GNF")
            Text(offer.description)
        }
    }
}
```

---

### Étape 4 : Créer la Session

**Endpoint:** `POST /sessions`
```kotlin
suspend fun createSession(
    stationId: String,
    offerId: String,
    connectorId: Int = 1
) {
    val request = CreateSessionRequest(
        stationId = stationId,
        connectorId = connectorId,
        offerId = offerId,
        meterStart = 0
    )
    
    val response = api.createSession(request)
    
    // Response contient:
    // - session (status: PENDING)
    // - selectedOffer
    // - estimatedDuration
    // - estimatedCost
    
    // Afficher écran de confirmation
    navigator.navigateToSessionConfirmation(response)
}

@POST("sessions")
suspend fun createSession(
    @Body request: CreateSessionRequest
): CreateSessionResponse

data class CreateSessionRequest(
    val stationId: String,
    val connectorId: Int,
    val offerId: String,
    val meterStart: Int = 0
)

data class CreateSessionResponse(
    val session: Session,
    val selectedOffer: Offer,
    val estimatedDuration: Int,
    val estimatedCost: Int
)

data class Session(
    val id: String,
    val userId: String,
    val stationId: String,
    val status: String,  // PENDING, ACTIVE, COMPLETED
    val pricePerKwh: Int,
    val station: Station
)
```

---

### Étape 5 : Démarrer la Session

**Endpoint:** `POST /sessions/{id}/start`
```kotlin
suspend fun startSession(sessionId: String) {
    val response = api.startSession(sessionId)
    
    // Response:
    // - session (status: ACTIVE)
    // - startTime
    
    // Afficher écran de monitoring
    navigator.navigateToSessionMonitoring(response)
}

@POST("sessions/{id}/start")
suspend fun startSession(
    @Path("id") sessionId: String
): Session
```

---

### Étape 6 : Monitoring Temps Réel

**Endpoint:** `GET /sessions/my/active`
```kotlin
// Polling toutes les 5 secondes
suspend fun monitorSession() {
    while (sessionActive) {
        val activeSessions = api.getActiveSessions()
        
        if (activeSessions.isNotEmpty()) {
            val session = activeSessions[0]
            
            // Mettre à jour l'UI
            updateUI(session)
        }
        
        delay(5000) // 5 secondes
    }
}

@Composable
fun SessionMonitoringScreen(sessionId: String) {
    var session by remember { mutableStateOf<Session?>(null) }
    
    LaunchedEffect(sessionId) {
        while (true) {
            session = api.getActiveSessions().firstOrNull()
            delay(5000)
        }
    }
    
    session?.let {
        Column {
            Text("Session Active", style = MaterialTheme.typography.h5)
            Text("Durée: ${calculateDuration(it.startTime)}")
            Text("Énergie: ${it.energyConsumed ?: 0} kWh")
            Text("Coût estimé: ${calculateCost(it)} GNF")
            
            Button(onClick = { /* Stop session */ }) {
                Text("Arrêter la charge")
            }
        }
    }
}
```

---

### Étape 7 : Arrêter la Session

**Endpoint:** `POST /sessions/{id}/stop`
```kotlin
suspend fun stopSession(sessionId: String, meterStop: Int) {
    val request = StopSessionRequest(
        meterStop = meterStop,
        stopReason = "User stopped"
    )
    
    val response = api.stopSession(sessionId, request)
    
    // Response:
    // - session (status: COMPLETED)
    // - energyConsumed
    // - cost
    // - isPaid: false
    
    // Afficher écran de paiement
    navigator.navigateToPayment(response)
}

@POST("sessions/{id}/stop")
suspend fun stopSession(
    @Path("id") sessionId: String,
    @Body request: StopSessionRequest
): Session

data class StopSessionRequest(
    val meterStop: Int,
    val stopReason: String = "User stopped"
)
```

---

### Étape 8 : Payer la Session

**Endpoint:** `POST /payments/session/{sessionId}/pay`
```kotlin
suspend fun paySession(sessionId: String) {
    val response = api.paySession(sessionId)
    
    when (response.method) {
        "NG_WALLET" -> {
            // Paiement réussi avec Wallet
            showSuccessDialog(
                "Paiement effectué avec succès !",
                "Nouveau solde: ${response.walletBalance} GNF"
            )
            
            navigator.navigateToHome()
        }
        
        "CINETPAY" -> {
            // Rediriger vers Cinetpay
            openCinetpayWebView(response.paymentUrl)
        }
    }
}

@POST("payments/session/{sessionId}/pay")
suspend fun paySession(
    @Path("sessionId") sessionId: String
): PaymentResponse

data class PaymentResponse(
    val method: String,  // NG_WALLET ou CINETPAY
    val success: Boolean,
    val payment: Payment?,
    val walletBalance: Int?,
    val paymentUrl: String?,
    val providers: List<String>?
)
```

---

### Étape 9 : Paiement Cinetpay (WebView)
```kotlin
@Composable
fun CinetpayWebView(url: String, onSuccess: () -> Unit) {
    AndroidView(
        factory = { context ->
            WebView(context).apply {
                settings.javaScriptEnabled = true
                
                webViewClient = object : WebViewClient() {
                    override fun onPageFinished(view: WebView?, url: String?) {
                        // Vérifier si paiement terminé
                        if (url?.contains("success") == true) {
                            onSuccess()
                        }
                    }
                }
                
                loadUrl(url)
            }
        }
    )
}

// Utilisation
CinetpayWebView(
    url = paymentResponse.paymentUrl,
    onSuccess = {
        // Vérifier le statut du paiement
        checkPaymentStatus(sessionId)
    }
)
```

---

## 🗺️ Carte Interactive (Leaflet)

### Intégration Leaflet avec Android

**Option 1 : WebView avec Leaflet.js**
```kotlin
@Composable
fun MapScreen() {
    val htmlContent = """
        <!DOCTYPE html>
        <html>
        <head>
            <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
            <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
            <style>
                #map { height: 100vh; }
            </style>
        </head>
        <body>
            <div id="map"></div>
            <script>
                // Carte centrée sur Conakry
                const map = L.map('map').setView([9.5092, -13.7122], 13);
                
                // Tuiles OpenStreetMap
                L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
                    maxZoom: 19,
                }).addTo(map);
                
                // Charger les stations
                fetch('https://api.evcharge.gn/map/stations/geojson')
                    .then(res => res.json())
                    .then(geojson => {
                        L.geoJSON(geojson, {
                            pointToLayer: (feature, latlng) => {
                                const color = feature.properties.markerColor;
                                
                                return L.marker(latlng, {
                                    icon: L.icon({
                                        iconUrl: `marker-${color}.png`,
                                        iconSize: [32, 32]
                                    })
                                }).bindPopup(`
                                    <h3>${feature.properties.name}</h3>
                                    <p>Status: ${feature.properties.status}</p>
                                    <p>Prix: ${feature.properties.pricePerKwh} GNF/kWh</p>
                                    <button onclick="selectStation('${feature.properties.id}')">
                                        Sélectionner
                                    </button>
                                `);
                            }
                        }).addTo(map);
                    });
                
                // Callback vers Kotlin
                function selectStation(stationId) {
                    Android.onStationSelected(stationId);
                }
            </script>
        </body>
        </html>
    """.trimIndent()
    
    AndroidView(
        factory = { context ->
            WebView(context).apply {
                settings.javaScriptEnabled = true
                
                addJavascriptInterface(object {
                    @JavascriptInterface
                    fun onStationSelected(stationId: String) {
                        // Naviguer vers les détails
                        navigator.navigateToStationDetails(stationId)
                    }
                }, "Android")
                
                loadDataWithBaseURL(null, htmlContent, "text/html", "UTF-8", null)
            }
        }
    )
}
```

---

**Option 2 : Native avec OSMDroid**
```kotlin
dependencies {
    implementation("org.osmdroid:osmdroid-android:6.1.16")
}

@Composable
fun NativeMapScreen() {
    AndroidView(
        factory = { context ->
            MapView(context).apply {
                setTileSource(TileSourceFactory.MAPNIK)
                setMultiTouchControls(true)
                
                controller.setZoom(13.0)
                controller.setCenter(GeoPoint(9.5092, -13.7122))
                
                // Charger les stations
                loadStations(this)
            }
        }
    )
}

suspend fun loadStations(mapView: MapView) {
    val geojson = api.getStationsGeoJSON()
    
    geojson.features.forEach { feature ->
        val lat = feature.geometry.coordinates[1]
        val lng = feature.geometry.coordinates[0]
        
        val marker = Marker(mapView)
        marker.position = GeoPoint(lat, lng)
        marker.title = feature.properties.name
        marker.snippet = "Status: ${feature.properties.status}"
        
        // Icon par status
        val iconRes = when (feature.properties.markerColor) {
            "green" -> R.drawable.marker_green
            "orange" -> R.drawable.marker_orange
            "red" -> R.drawable.marker_red
            else -> R.drawable.marker_blue
        }
        marker.icon = ContextCompat.getDrawable(context, iconRes)
        
        mapView.overlays.add(marker)
    }
    
    mapView.invalidate()
}
```

---

## 💰 Wallet Management

### Afficher le Solde

**Endpoint:** `GET /payments/wallet/my`
```kotlin
@Composable
fun WalletScreen() {
    var wallet by remember { mutableStateOf<Wallet?>(null) }
    
    LaunchedEffect(Unit) {
        wallet = api.getMyWallet()
    }
    
    wallet?.let {
        Column {
            Text("NG Wallet", style = MaterialTheme.typography.h4)
            Text("${it.balance} GNF", style = MaterialTheme.typography.h3)
            
            Button(onClick = { /* Recharger */ }) {
                Text("Recharger")
            }
            
            // Transactions récentes
            LazyColumn {
                items(it.transactions) { transaction ->
                    TransactionItem(transaction)
                }
            }
        }
    }
}

data class Wallet(
    val id: String,
    val balance: Int,
    val transactions: List<WalletTransaction>
)

data class WalletTransaction(
    val id: String,
    val type: String,  // CREDIT, DEBIT, REFUND
    val amount: Int,
    val balanceBefore: Int,
    val balanceAfter: Int,
    val description: String,
    val createdAt: String
)
```

---

### Recharger le Wallet

**Endpoint:** `POST /payments/wallet/recharge`
```kotlin
suspend fun rechargeWallet(amount: Int) {
    val request = RechargeWalletRequest(
        amount = amount,
        method = "MOBILE_MONEY"
    )
    
    val response = api.rechargeWallet(request)
    
    // Rediriger vers Cinetpay
    openCinetpayWebView(response.paymentUrl)
}

@POST("payments/wallet/recharge")
suspend fun rechargeWallet(
    @Body request: RechargeWalletRequest
): RechargeWalletResponse

data class RechargeWalletRequest(
    val amount: Int,
    val method: String = "MOBILE_MONEY"
)

data class RechargeWalletResponse(
    val payment: Payment,
    val paymentUrl: String
)
```

---

## 🔔 Notifications

### Push Notifications (Firebase Cloud Messaging)
```kotlin
// Firebase setup
class MyFirebaseMessagingService : FirebaseMessagingService() {
    
    override fun onMessageReceived(remoteMessage: RemoteMessage) {
        // Notification reçue
        val title = remoteMessage.notification?.title
        val body = remoteMessage.notification?.body
        val data = remoteMessage.data
        
        when (data["type"]) {
            "SESSION_STARTED" -> {
                showNotification(
                    title = "Charge démarrée",
                    body = "Votre session de recharge a commencé"
                )
            }
            
            "SESSION_COMPLETED" -> {
                showNotification(
                    title = "Charge terminée",
                    body = "Votre session est terminée. Coût: ${data["cost"]} GNF"
                )
            }
            
            "PAYMENT_SUCCESS" -> {
                showNotification(
                    title = "Paiement confirmé",
                    body = "Votre paiement de ${data["amount"]} GNF a été confirmé"
                )
            }
        }
    }
    
    override fun onNewToken(token: String) {
        // Envoyer le token au backend
        sendTokenToServer(token)
    }
}
```

---

## 🔗 Deep Links

### Configuration

**AndroidManifest.xml:**
```xml
<activity android:name=".MainActivity">
    <intent-filter>
        <action android:name="android.intent.action.VIEW" />
        <category android:name="android.intent.category.DEFAULT" />
        <category android:name="android.intent.category.BROWSABLE" />
        
        <data
            android:scheme="evcharge"
            android:host="station" />
        <data
            android:scheme="evcharge"
            android:host="session" />
        <data
            android:scheme="evcharge"
            android:host="payment" />
    </intent-filter>
</activity>
```

### Utilisation
```kotlin
// Deep link examples:
// evcharge://station/uuid → Afficher détails station
// evcharge://session/uuid → Afficher détails session
// evcharge://payment/uuid → Afficher détails paiement

fun handleDeepLink(intent: Intent) {
    val uri = intent.data
    
    when (uri?.host) {
        "station" -> {
            val stationId = uri.pathSegments[0]
            navigator.navigateToStationDetails(stationId)
        }
        
        "session" -> {
            val sessionId = uri.pathSegments[0]
            navigator.navigateToSessionDetails(sessionId)
        }
        
        "payment" -> {
            val paymentId = uri.pathSegments[0]
            navigator.navigateToPaymentDetails(paymentId)
        }
    }
}
```

---

## 🛠️ Configuration HTTP Client

### Retrofit Setup
```kotlin
object ApiClient {
    private const val BASE_URL = "https://api.evcharge.gn/"
    
    private val okHttpClient = OkHttpClient.Builder()
        .addInterceptor { chain ->
            val request = chain.request().newBuilder()
            
            // Ajouter le token
            val token = secureStorage.getAccessToken()
            if (token != null) {
                request.addHeader("Authorization", "Bearer $token")
            }
            
            request.addHeader("Content-Type", "application/json")
            
            chain.proceed(request.build())
        }
        .addInterceptor(HttpLoggingInterceptor().apply {
            level = if (BuildConfig.DEBUG) {
                HttpLoggingInterceptor.Level.BODY
            } else {
                HttpLoggingInterceptor.Level.NONE
            }
        })
        .connectTimeout(30, TimeUnit.SECONDS)
        .readTimeout(30, TimeUnit.SECONDS)
        .build()
    
    val retrofit: Retrofit = Retrofit.Builder()
        .baseUrl(BASE_URL)
        .client(okHttpClient)
        .addConverterFactory(GsonConverterFactory.create())
        .build()
    
    val api: ApiService = retrofit.create(ApiService::class.java)
}

interface ApiService {
    // Auth
    @POST("auth/register")
    suspend fun register(@Body request: RegisterRequest): AuthResponse
    
    @POST("auth/login")
    suspend fun login(@Body request: LoginRequest): AuthResponse
    
    @GET("auth/me")
    suspend fun getMe(): User
    
    // Stations
    @GET("stations/scan/qr/{qrCode}")
    suspend fun scanQR(@Path("qrCode") qrCode: String): ScanQRResponse
    
    @GET("map/stations/geojson")
    suspend fun getStationsGeoJSON(): GeoJSON
    
    // Sessions
    @POST("sessions")
    suspend fun createSession(@Body request: CreateSessionRequest): CreateSessionResponse
    
    @POST("sessions/{id}/start")
    suspend fun startSession(@Path("id") id: String): Session
    
    @POST("sessions/{id}/stop")
    suspend fun stopSession(@Path("id") id: String, @Body request: StopSessionRequest): Session
    
    @GET("sessions/my/active")
    suspend fun getActiveSessions(): List<Session>
    
    // Payments
    @GET("payments/wallet/my")
    suspend fun getMyWallet(): Wallet
    
    @POST("payments/wallet/recharge")
    suspend fun rechargeWallet(@Body request: RechargeWalletRequest): RechargeWalletResponse
    
    @POST("payments/session/{sessionId}/pay")
    suspend fun paySession(@Path("sessionId") sessionId: String): PaymentResponse
}
```

---

## 📦 Dépendances Recommandées
```kotlin
// build.gradle.kts

dependencies {
    // Networking
    implementation("com.squareup.retrofit2:retrofit:2.9.0")
    implementation("com.squareup.retrofit2:converter-gson:2.9.0")
    implementation("com.squareup.okhttp3:logging-interceptor:4.11.0")
    
    // QR Code Scanner
    implementation("com.google.mlkit:barcode-scanning:17.2.0")
    
    // Maps
    implementation("org.osmdroid:osmdroid-android:6.1.16")
    // OU WebView avec Leaflet.js
    
    // Secure Storage
    implementation("androidx.security:security-crypto:1.1.0-alpha06")
    
    // Firebase (Notifications)
    implementation(platform("com.google.firebase:firebase-bom:32.7.0"))
    implementation("com.google.firebase:firebase-messaging-ktx")
    
    // Coroutines
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.7.3")
    
    // Compose
    implementation(platform("androidx.compose:compose-bom:2024.01.00"))
    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.material3:material3")
    implementation("androidx.navigation:navigation-compose:2.7.6")
}
```

---

## 🧪 Testing
```kotlin
// Test API calls
@Test
fun testLogin() = runBlocking {
    val request = LoginRequest(
        email = "test@evcharge.gn",
        password = "Test123!"
    )
    
    val response = api.login(request)
    
    assertNotNull(response.accessToken)
    assertEquals("test@evcharge.gn", response.user.email)
}

@Test
fun testScanQR() = runBlocking {
    val response = api.scanQR("QR-MTM001-2026")
    
    assertNotNull(response.station)
    assertEquals(3, response.offers.size)
}
```

---

## 🎨 UI/UX Best Practices

### 1. Loading States
```kotlin
@Composable
fun LoadingButton(
    text: String,
    isLoading: Boolean,
    onClick: () -> Unit
) {
    Button(
        onClick = onClick,
        enabled = !isLoading
    ) {
        if (isLoading) {
            CircularProgressIndicator(modifier = Modifier.size(20.dp))
        } else {
            Text(text)
        }
    }
}
```

### 2. Error Handling
```kotlin
@Composable
fun ErrorDialog(error: String?, onDismiss: () -> Unit) {
    if (error != null) {
        AlertDialog(
            onDismissRequest = onDismiss,
            title = { Text("Erreur") },
            text = { Text(error) },
            confirmButton = {
                TextButton(onClick = onDismiss) {
                    Text("OK")
                }
            }
        )
    }
}
```

### 3. Offline Mode
```kotlin
// Vérifier la connexion
fun isOnline(context: Context): Boolean {
    val cm = context.getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
    val network = cm.activeNetwork ?: return false
    val capabilities = cm.getNetworkCapabilities(network) ?: return false
    
    return capabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
}

// Caching avec Room
@Database(entities = [Station::class, Session::class], version = 1)
abstract class AppDatabase : RoomDatabase() {
    abstract fun stationDao(): StationDao
    abstract fun sessionDao(): SessionDao
}
```

---

## 📞 Support

- **Documentation API**: https://docs.evcharge.gn/api
- **Email**: mobile@evcharge.gn
- **Slack**: #mobile-dev

---

**Développé par NG Technologie - Guinée 🇬🇳**
```

---

# 🎊🎊🎊 DOCUMENTATION COMPLÈTE TERMINÉE ! 🎊🎊🎊

**7 FICHIERS DE DOCUMENTATION CRÉÉS :**
```
✅ README.md - Vue d'ensemble complète
✅ API.md - Documentation API (50+ endpoints)
✅ INSTALLATION.md - Guide d'installation détaillé
✅ DEPLOYMENT.md - Guide de déploiement AWS
✅ DATABASE.md - Schéma base de données (19 tables)
✅ ARCHITECTURE.md - Architecture système complète
✅ MOBILE_INTEGRATION.md - Guide intégration mobile