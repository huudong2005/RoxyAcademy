using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using RoxyAcademy.Api.Data;
using System.Text;
using Microsoft.AspNetCore.Identity;
using RoxyAcademy.Api.Models;
using RoxyAcademy.Api.Services;
using Microsoft.OpenApi.Models;
// 1. Thêm dòng này lên nhóm using ở trên cùng của file
using Scalar.AspNetCore;

var builder = WebApplication.CreateBuilder(args);

// 1. Thêm cấu hình CORS (Cho phép React và Zalo Mini App gọi API)
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});

builder.Services.AddControllers();
builder.Services.AddOpenApi(options =>
{
    options.AddDocumentTransformer((document, context, cancellationToken) =>
    {
        document.Components ??= new OpenApiComponents();
        document.Components.SecuritySchemes ??= new Dictionary<string, OpenApiSecurityScheme>();
        document.Components.SecuritySchemes["Bearer"] = new OpenApiSecurityScheme
        {
            Type = SecuritySchemeType.Http,
            Scheme = "bearer",
            BearerFormat = "JWT",
            Description = "Nhập chuỗi JWT Token của bạn vào đây"
        };
        return Task.CompletedTask;
    });
});

// Đăng ký DbContext
builder.Services.AddDbContext<RoxyDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("Default")));

builder.Services.AddScoped<ITokenService, TokenService>();
builder.Services.AddSingleton<IPasswordHasher<User>, PasswordHasher<User>>();

// 2. Thiết lập JWT Authentication
var jwtKey = builder.Configuration["Jwt:Key"] ?? throw new InvalidOperationException("JWT Key is missing.");
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.MapInboundClaims = false;
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey)),
            ValidateIssuer = true,
            ValidIssuer = builder.Configuration["Jwt:Issuer"],
            ValidateAudience = true,
            ValidAudience = builder.Configuration["Jwt:Audience"],
            ValidateLifetime = true,
            ClockSkew = TimeSpan.Zero,
            NameClaimType = "name",
            RoleClaimType = "role"
        };
    });

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
    // 2. Thêm khối cấu hình giao diện Scalar này vào
    app.MapScalarApiReference(options =>
    {
        options.WithTitle("Roxy Academy API");
        options.Authentication = new ScalarAuthenticationOptions
        {
            PreferredSecurityScheme = "Bearer"
        };
    });

    using var scope = app.Services.CreateScope();
    var db = scope.ServiceProvider.GetRequiredService<RoxyDbContext>();
    var hasher = scope.ServiceProvider.GetRequiredService<IPasswordHasher<User>>();
    var seedPassword = app.Configuration["Seed:AdminPassword"];

    if (!string.IsNullOrEmpty(seedPassword) && !db.Users.Any(u => u.Role == "SuperAdmin"))
    {
        var admin = new User
        {
            PhoneNumber = "0900000000",
            FullName = "Super Admin",
            Role = "SuperAdmin",
            PreferredLanguage = "vi",
            IsActive = true
        };
        admin.PasswordHash = hasher.HashPassword(admin, seedPassword);
        db.Users.Add(admin);
        db.SaveChanges();
    }
}

app.UseHttpsRedirection();

// 3. Kích hoạt CORS (Phải đặt trước Auth)
app.UseCors("AllowAll");

// 4. Kích hoạt Authentication & Authorization
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();