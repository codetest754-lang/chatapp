FROM mcr.microsoft.com/dotnet/sdk:10.0-preview AS build
WORKDIR /src
COPY ./shared ./shared
COPY ./services/user-service/src ./services/user-service/src
WORKDIR /src/services/user-service/src
RUN dotnet restore && dotnet publish -c Release -o /app

FROM mcr.microsoft.com/dotnet/aspnet:10.0-preview
WORKDIR /app
COPY --from=build /app .
EXPOSE 8080
ENTRYPOINT ["dotnet", "user-service.dll"]
