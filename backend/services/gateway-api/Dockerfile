FROM mcr.microsoft.com/dotnet/sdk:10.0-preview AS build
WORKDIR /src
COPY ./shared ./shared
COPY ./services/gateway-api/src ./services/gateway-api/src
WORKDIR /src/services/gateway-api/src
RUN dotnet restore && dotnet publish -c Release -o /app

FROM mcr.microsoft.com/dotnet/aspnet:10.0-preview
WORKDIR /app
COPY --from=build /app .
EXPOSE 8080
ENTRYPOINT ["dotnet", "gateway-api.dll"]
