use axum::extract::State;
use axum::http::StatusCode;
use axum::response::IntoResponse;
use axum::Json;

use crate::server::{AppState, HealthResponse, ReadyResponse};

pub(in crate::server) async fn health() -> impl IntoResponse {
    (StatusCode::OK, Json(HealthResponse { status: "ok" }))
}

pub(in crate::server) async fn ready(State(state): State<AppState>) -> impl IntoResponse {
    let state = state.inner.lock().await;
    if state.ctx.is_some() {
        (
            StatusCode::OK,
            Json(ReadyResponse {
                status: "ready",
                model: Some(state.model_name.clone()),
                message: None,
            }),
        )
    } else {
        (
            StatusCode::SERVICE_UNAVAILABLE,
            Json(ReadyResponse {
                status: "not_ready",
                model: None,
                message: Some("no model loaded"),
            }),
        )
    }
}
